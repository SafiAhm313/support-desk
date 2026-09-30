import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import request from 'supertest';

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;
const APP_ENTRY = path.join(__dirname, '..', 'dist', 'main.js');

let serverProcess: ChildProcess;
let testsFinished = false;

function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      request(url)
        .get('/')
        .timeout(2000)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error('Server did not start in time'));
          } else {
            setTimeout(tryConnect, 300);
          }
        });
    };
    tryConnect();
  });
}

beforeAll(async () => {
  serverProcess = spawn(process.execPath, [APP_ENTRY], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  serverProcess.stdout?.on('data', (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });
  serverProcess.stderr?.on('data', (chunk) => {
    process.stderr.write(`[server-err] ${chunk}`);
  });
  serverProcess.on('error', (err) => {
    console.error('Failed to spawn server process:', err);
  });
  serverProcess.on('exit', (code, signal) => {
    if (!testsFinished) {
      console.log(`Server process exited early: code=${code} signal=${signal}`);
    }
  });

  await waitForServer(BASE_URL);
}, 90000);

afterAll(() => {
  testsFinished = true;
  serverProcess?.kill();
});

describe('Support Desk end-to-end', () => {
  const unique = Date.now();
  const customerEmail = `e2e-customer-${unique}@test.com`;
  const customer2Email = `e2e-customer2-${unique}@test.com`;
  const password = 'password123';

  let customerToken: string;
  let customer2Token: string;
  let agentToken: string;
  let ticketId: number;

  it('registers a new customer', async () => {
    const res = await request(BASE_URL)
      .post('/auth/register')
      .send({ email: customerEmail, password, fullName: 'E2E Customer' })
      .expect(201);
    expect(res.body.role).toBe('customer');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('registers a second customer', async () => {
    await request(BASE_URL)
      .post('/auth/register')
      .send({ email: customer2Email, password, fullName: 'E2E Customer Two' })
      .expect(201);
  });

  it('logs the customer in', async () => {
    const res = await request(BASE_URL)
      .post('/auth/login')
      .send({ email: customerEmail, password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    customerToken = res.body.accessToken;
  });

  it('logs the second customer in', async () => {
    const res = await request(BASE_URL)
      .post('/auth/login')
      .send({ email: customer2Email, password })
      .expect(200);
    customer2Token = res.body.accessToken;
  });

  it('logs a seeded agent in', async () => {
    const res = await request(BASE_URL)
      .post('/auth/login')
      .send({ email: 'agent1@supportdesk.test', password: 'password123' })
      .expect(200);
    agentToken = res.body.accessToken;
  });

  it('creates a ticket as the customer', async () => {
    const res = await request(BASE_URL)
      .post('/tickets')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        subject: 'E2E test ticket',
        body: 'Something broke',
        priority: 'high',
      })
      .expect(201);
    expect(res.body.status).toBe('open');
    ticketId = res.body.id;
  });

  it('lists tickets with a filter and a page', async () => {
    const res = await request(BASE_URL)
      .get('/tickets?status=open&page=1&pageSize=20')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(res.body.data.some((t: any) => t.id === ticketId)).toBe(true);
    expect(res.body.page).toBe(1);
  });

  it('assigns the ticket as an agent', async () => {
    const me = await request(BASE_URL)
      .get('/auth/me')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    const res = await request(BASE_URL)
      .post(`/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ assigneeId: me.body.id })
      .expect(200);
    expect(res.body.assignee.id).toBe(me.body.id);
  });

  it('moves the status legally: open -> in_progress', async () => {
    const res = await request(BASE_URL)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'in_progress' })
      .expect(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('rejects an illegal status move with 409', async () => {
    await request(BASE_URL)
      .post(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'closed' })
      .expect(409);
  });

  it('adds a comment to the ticket', async () => {
    await request(BASE_URL)
      .post(`/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ body: 'Any updates?' })
      .expect(201);
  });

  it("confirms a second customer gets 404 for the first customer's ticket", async () => {
    await request(BASE_URL)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .expect(404);
  });
});
describe('Production hardening', () => {
  it('GET /health answers 200 with no token', async () => {
    const res = await request(BASE_URL).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('ok');
  });

  it('rate limits failed logins: the 6th attempt in the window answers 429', async () => {
    const email = `e2e-ratelimit-${Date.now()}@test.com`;

    for (let attempt = 1; attempt <= 5; attempt++) {
      await request(BASE_URL)
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    }

    const res = await request(BASE_URL)
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(429);

    expect(res.body.statusCode).toBe(429);
  });

  it('a malformed request body returns a clean envelope with no stack trace or SQL', async () => {
    const res = await request(BASE_URL)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ this is not valid json')
      .expect(400);

    const bodyText = JSON.stringify(res.body);

    expect(Object.keys(res.body).sort()).toEqual(
      ['message', 'statusCode', 'timestamp'].sort(),
    );
    expect(bodyText).not.toMatch(/at .*\.(ts|js):\d+/); // no stack trace frames
    expect(bodyText.toUpperCase()).not.toMatch(/SELECT .* FROM/); // no SQL
    expect(bodyText).not.toMatch(/node_modules/); // no internal file paths
  });
});

describe('Error responses', () => {
  it('a protected route without a token answers 401', async () => {
    const res = await request(BASE_URL).get('/tickets').expect(401);
    expect(res.body.statusCode).toBe(401);
  });

  it('a failed login answers 401 with a generic message', async () => {
    const res = await request(BASE_URL)
      .post('/auth/login')
      .send({
        email: `e2e-nobody-${Date.now()}@test.com`,
        password: 'wrong-password',
      })
      .expect(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('an invalid registration body answers 400 from validation', async () => {
    const res = await request(BASE_URL)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'x', fullName: '' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });
});


describe('Assignable users', () => {
  it('rejects an unauthenticated request with 401', async () => {
    await request(BASE_URL).get('/users/assignable').expect(401);
  });

  it("rejects a customer's request with 403", async () => {
    const email = `e2e-assignable-customer-${Date.now()}@test.com`;
    await request(BASE_URL)
      .post('/auth/register')
      .send({ email, password: 'password123', fullName: 'E2E Customer' })
      .expect(201);
    const login = await request(BASE_URL)
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    await request(BASE_URL)
      .get('/users/assignable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('lets an agent list agents and admins, with no password hash', async () => {
    const login = await request(BASE_URL)
      .post('/auth/login')
      .send({ email: 'agent1@supportdesk.test', password: 'password123' })
      .expect(200);

    const res = await request(BASE_URL)
      .get('/users/assignable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    expect(
      res.body.every((u: any) => u.role === 'agent' || u.role === 'admin'),
    ).toBe(true);
    expect(res.body.every((u: any) => u.passwordHash === undefined)).toBe(
      true,
    );
  });
});

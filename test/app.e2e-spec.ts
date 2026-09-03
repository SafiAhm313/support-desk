import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import request from 'supertest';

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;
const APP_ENTRY = path.join(__dirname, '..', 'dist', 'main.js');

let serverProcess: ChildProcess;
let testsFinished = false;

function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
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
}, 30000);

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
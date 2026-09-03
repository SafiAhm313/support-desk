import { AppDataSource } from '../data-source';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Comment } from '../comments/comment.entity';
import { Tag } from '../tags/tag.entity';
import { TicketEvent } from '../tickets/ticket-event.entity';
import { UserRole, TicketStatus, TicketPriority } from '../common/enums';
import { computeDueAt } from '../tickets/due-date.util';

const PASSWORD = 'password123';

async function upsertUser(
  dataSource: typeof AppDataSource,
  email: string,
  fullName: string,
  role: UserRole,
): Promise<User> {
  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = repo.create({ email, passwordHash, fullName, role });
  return repo.save(user);
}

async function main() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const ticketRepo = AppDataSource.getRepository(Ticket);
  const commentRepo = AppDataSource.getRepository(Comment);
  const tagRepo = AppDataSource.getRepository(Tag);
  const eventRepo = AppDataSource.getRepository(TicketEvent);

  console.log('Seeding users...');
  const admin = await upsertUser(
    AppDataSource,
    'admin@supportdesk.test',
    'Ada Admin',
    UserRole.ADMIN,
  );
  const agents = await Promise.all([
    upsertUser(AppDataSource, 'agent1@supportdesk.test', 'Alex Agent', UserRole.AGENT),
    upsertUser(AppDataSource, 'agent2@supportdesk.test', 'Amy Agent', UserRole.AGENT),
  ]);
  const customers = await Promise.all([
    upsertUser(AppDataSource, 'customer1@supportdesk.test', 'Cara Customer', UserRole.CUSTOMER),
    upsertUser(AppDataSource, 'customer2@supportdesk.test', 'Cole Customer', UserRole.CUSTOMER),
    upsertUser(AppDataSource, 'customer3@supportdesk.test', 'Cleo Customer', UserRole.CUSTOMER),
    upsertUser(AppDataSource, 'customer4@supportdesk.test', 'Cody Customer', UserRole.CUSTOMER),
    upsertUser(AppDataSource, 'customer5@supportdesk.test', 'Cass Customer', UserRole.CUSTOMER),
  ]);

  console.log('Seeding tags...');
  const tagNames = ['hardware', 'software', 'network', 'billing', 'account', 'urgent-followup'];
  const tags: Tag[] = [];
  for (const name of tagNames) {
    let tag = await tagRepo.findOne({ where: { name } });
    if (!tag) {
      tag = await tagRepo.save(tagRepo.create({ name }));
    }
    tags.push(tag);
  }

  const existingTicketCount = await ticketRepo.count();
  if (existingTicketCount > 0) {
    console.log(`${existingTicketCount} tickets already exist — skipping ticket seeding to stay idempotent.`);
    await AppDataSource.destroy();
    return;
  }

  console.log('Seeding tickets...');
  const statuses = [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ];
  const priorities = [
    TicketPriority.LOW,
    TicketPriority.NORMAL,
    TicketPriority.HIGH,
    TicketPriority.URGENT,
  ];

  const subjects = [
    'Printer will not turn on',
    'Cannot log into my account',
    'Invoice shows wrong amount',
    'App crashes on startup',
    'Password reset email never arrives',
    'VPN keeps disconnecting',
    'Missing items in my order',
    'Website is very slow',
    'Need to update billing address',
    'Two-factor codes not working',
    'Laptop screen is flickering',
    'Export to CSV is broken',
    'Duplicate charge on my card',
    'Cannot upload attachments',
    'Notification emails are delayed',
    'Dashboard shows stale data',
    'Mobile app logs me out constantly',
    'Refund request for cancelled order',
    'Integration with calendar failing',
    'Search results are incorrect',
    'Need help migrating my data',
    'Team member cannot get access',
    'Report totals do not match',
    'Unexpected downtime this morning',
    'Feature request: dark mode',
    'Broken link in confirmation email',
    'Trial expired but I was still charged',
    'Slow response times on API',
  ];

  const now = Date.now();
  const createdTickets: Ticket[] = [];

  for (let i = 0; i < subjects.length; i++) {
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];
    const requester = customers[i % customers.length];
    const isOverdue = i % 9 === 0; // ensures at least 3 overdue among 28

    const dueAt = isOverdue
      ? new Date(now - 1000 * 60 * 60 * 24) // one day in the past
      : computeDueAt(priority);

    const ticket = ticketRepo.create({
      subject: subjects[i],
      body: `Details for: ${subjects[i]}`,
      status: isOverdue && (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED)
        ? TicketStatus.OPEN // keep truly-overdue tickets unresolved
        : status,
      priority,
      requester,
      assignee: status === TicketStatus.OPEN ? null : agents[i % agents.length],
      dueAt,
    });
    const saved = await ticketRepo.save(ticket);
    createdTickets.push(saved);

    // attach 0-2 tags
    const tagCount = i % 3;
    if (tagCount > 0) {
      saved.tags = [tags[i % tags.length], tags[(i + 1) % tags.length]].slice(0, tagCount);
      await ticketRepo.save(saved);
    }

    // write an event for every ticket that has ever left "open"
    if (saved.status !== TicketStatus.OPEN) {
      await eventRepo.save(
        eventRepo.create({
          ticket: saved,
          actor: agents[i % agents.length],
          fromStatus: TicketStatus.OPEN,
          toStatus: saved.status,
          note: null,
        }),
      );
    }
  }

  console.log('Seeding comments...');
  let internalCount = 0;
  for (let i = 0; i < createdTickets.length; i++) {
    const ticket = createdTickets[i];
    if (i % 2 === 0) {
      await commentRepo.save(
        commentRepo.create({
          ticket,
          author: ticket.requester,
          body: 'Any update on this?',
          isInternal: false,
        }),
      );
    }
    if (i % 5 === 0) {
      await commentRepo.save(
        commentRepo.create({
          ticket,
          author: agents[i % agents.length],
          body: 'Internal: escalate to L2 if not resolved by EOD.',
          isInternal: true,
        }),
      );
      internalCount++;
    }
  }

  console.log('Seed complete.');
  console.log(`Users: 1 admin, ${agents.length} agents, ${customers.length} customers`);
  console.log(`Tickets: ${createdTickets.length}`);
  console.log(`Tags: ${tags.length}`);
  console.log(`Internal comments: ${internalCount}`);
  console.log('---');
  console.log('Seeded accounts (all use password: password123)');
  console.log(`Admin:     ${admin.email}`);
  agents.forEach((a) => console.log(`Agent:     ${a.email}`));
  customers.forEach((c) => console.log(`Customer:  ${c.email}`));

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
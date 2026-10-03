# Support Desk - Backend

A support ticketing system backend, built as the Week 10 capstone of the Coding Pixel Full-Stack Internship Program, hardened and deployed in Week 12. Three roles - customer, agent, admin - each see a different picture of the same data, enforced through guards, not hand-checks.

**Live API:** https://support-desk-cyan.vercel.app
**Live client:** https://support-desk-client-iota.vercel.app
**Health check:** https://support-desk-cyan.vercel.app/health

Stack: NestJS, TypeORM, PostgreSQL, TypeScript. Deployed on Vercel; database on Neon.

## Roles

| Role     | Can do |
|----------|--------|
| Customer | Create tickets, see and update only their own tickets, comment, never see internal comments |
| Agent    | See all tickets, assign, change status, tag, add internal comments |
| Admin    | Everything an agent can, plus create tags and delete tickets |

A role can never be set at registration - every new account is a customer. Agents and admins only exist because the seed or an existing admin created them.

## Environment variables

Copy `.env.example` to `.env` and fill in real values. See `docs/RUNBOOK.md` for the full table of what each deployed host needs.

Local development uses individual `DB_*` variables; production uses a single `DATABASE_URL` with SSL. See `src/database.config.ts`.
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=support_desk
JWT_SECRET=change_me

## Setup

```bash
npm install
npm run migration:run
npm run seed
npm run start:dev
```

Run migrations before seeding - the seed script writes through the repository API, not raw SQL, and is safe to run more than once (it skips ticket seeding if tickets already exist).

## Seeded accounts

All seeded accounts use the password `password123`.

| Role     | Email |
|----------|-------|
| Admin    | admin@supportdesk.test |
| Agent    | agent1@supportdesk.test |
| Agent    | agent2@supportdesk.test |
| Customer | customer1@supportdesk.test |
| Customer | customer2@supportdesk.test |
| Customer | customer3@supportdesk.test |
| Customer | customer4@supportdesk.test |
| Customer | customer5@supportdesk.test |

These accounts exist on both the local database and the deployed Neon database.

## Endpoints

| Method | Path | Who | Notes |
|--------|------|-----|-------|
| GET | `/health` | anyone | No auth required; reports database connectivity and `NODE_ENV` |
| POST | `/auth/register` | anyone | Always creates a customer; role in body is ignored |
| POST | `/auth/login` | anyone | Returns a JWT; rate limited to 5 failed attempts per email per 15 minutes (429 after that) |
| GET | `/auth/me` | signed in | |
| GET | `/users/assignable` | agent, admin | Lists agents and admins, for populating an assign control |
| POST | `/tickets` | signed in | `dueAt` is computed server-side from priority |
| GET | `/tickets` | signed in | Filters by `status`, `priority`, `assigneeId`, `tag`, `q`, `overdue`; sorts by `createdAt`/`dueAt`/`priority`; paginates with `page`/`pageSize` (max 100) |
| GET | `/tickets/:id` | signed in | 404 (not 403) if the ticket isn't the caller's to see |
| PATCH | `/tickets/:id` | requester or agent | |
| POST | `/tickets/:id/assign` | agent, admin | 422 if the proposed assignee isn't an agent/admin |
| POST | `/tickets/:id/status` | agent, admin | Enforces the fixed transition machine; 409 on illegal moves; reopening from `closed` requires a `note` |
| DELETE | `/tickets/:id` | admin | |
| POST | `/tickets/:id/comments` | signed in | Only agent/admin may set `isInternal: true` |
| GET | `/tickets/:id/comments` | signed in | Customers never receive internal comments |
| GET | `/tickets/:id/events` | signed in | Full audit trail, newest first |
| GET | `/tags` | signed in | |
| POST | `/tags` | admin | 409 on duplicate name |
| POST | `/tickets/:id/tags` | agent, admin | |
| DELETE | `/tickets/:id/tags/:tagId` | agent, admin | |

### Status transitions
open -> in_progress
in_progress -> resolved
resolved -> closed
resolved -> in_progress (reopen, no note required)
closed -> in_progress (reopen, note required)

Any other transition returns `409 Conflict`.

## Testing

```bash
npm test          # unit tests - status machine, due-date calc, visibility rule; no database
npm run build
npm run test:e2e  # full lifecycle over real HTTP, including hardening checks; builds first, so a clean checkout needs no manual step
```

CI (`.github/workflows/ci.yml`) runs both suites against a fresh Postgres container on every push and pull request to `main`.

## Production hardening

See `docs/HARDENING.md` for the record of Week 10/11 feedback and how each item was fixed, and `docs/RUNBOOK.md` for deployment, environment variables, running migrations against production, rollback, and logs.

- CORS: the deployed client's origin is allowed, alongside `localhost:3000` for development.
- Every production secret comes from the host's environment; nothing is committed.
- Unhandled errors return a clean envelope (`statusCode`, `message`, `timestamp`) with no stack trace and no SQL.
- Security headers (helmet): `nosniff`, a frame policy, `X-Powered-By` removed.
- Request bodies are capped at 100kb; an oversized body is refused with 413.
- Indexes exist on `status`, `priority`, `assignee_id`, and `due_at` (separate migration, Week 10's migration is unchanged).

## Architecture notes

- `status` and `priority` are real PostgreSQL enum types, generated by the TypeORM migration - not varchar columns.
- Customer visibility is enforced in two places: SQL-level scoping in `TicketsService.applyVisibility`, and a pure, independently-tested `canUserAccessTicket` function as a second guard.
- Every status change and assignment writes a `ticket_events` row from the server - there's no endpoint that writes an event directly.
- Role checks are declarative (`@Roles()` + `RolesGuard`), not hand-written `if` checks scattered through services.
- Ticket lists are always joined in one query (`leftJoinAndSelect`), never one query per row.

# Hardening - Weeks 10 and 11 feedback

| Feedback | Action | Commit |
|---|---|---|
| ERD: the assignee relation should be optional (`|o`) on the users side, not mandatory (`||`) | Marked `users` to `tickets` (assignee) and `users` to `ticket_events` (actor) as optional in docs/ERD.md, matching the nullable FK columns | b3c3df9 |
| No `.env.example` committed | Added `.env.example` listing every variable the app reads, with placeholder values | 917b2fe |
| e2e spec needed a server already running; failed 12/12 from a clean checkout | `npm run test:e2e` now runs `npm run build` first, so a clean checkout needs no manual build step | a82a98f |
| e2e spec asserted no 401 case and no 400 case | Added explicit cases: a protected route without a token (401), a failed login (401, generic message), an invalid registration body (400) | 2776f6a |
| Week 10 API has no endpoint to list agents/admins, so the client's assign control used a hardcoded `KNOWN_ASSIGNEES` list tied to specific seed ids | Added `GET /users/assignable` (agents/admins only); client now fetches real assignees instead of hardcoding ids, which also fixes a real bug the hardcoded list caused in production (wrong ids on the deployed database) | e1ffd86 |
| Client: only 400 and 404 were handled as distinct failures; 403, 409, and 422 fell through to a generic `ApiError` message | Added `lib/error-messages.ts` mapping 400/403/404/409/422 to distinct, accurate messages; wired into every handler on the ticket detail page | 5de3fda |
| Client: the submitted commit sat in a PR that changed only `package-lock.json`, not the feature work | Noted for this submission: the final commit pushed is the actual merge commit on `main`, carrying real code changes, not a lockfile-only PR | n/a - process note |

## Deliberately not fixed

- Nothing from the Week 10 or 11 feedback was left unaddressed.

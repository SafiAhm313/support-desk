# Runbook - Support Desk

## Deploy

Both pieces deploy automatically on merge to `main`; there is no manual deploy command for normal use.

- API: merge to `main` on https://github.com/SafiAhm313/support-desk -> Vercel builds and deploys https://support-desk-cyan.vercel.app
- Client: merge to `main` on https://github.com/SafiAhm313/support-desk-client -> Vercel builds and deploys https://support-desk-client-iota.vercel.app

To force a redeploy without a new commit: open the project in Vercel -> Deployments -> the latest `main` row -> the "..." menu -> Redeploy.

## Environment variables

| Host | Variable | Example | Secret? |
|---|---|---|---|
| API (Vercel, project `support-desk`) | `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Yes |
| API (Vercel, project `support-desk`) | `JWT_SECRET` | random 48+ byte string | Yes |
| Client (Vercel, project `support-desk-client`) | `NEXT_PUBLIC_API_URL` | `https://support-desk-cyan.vercel.app` | No (public by design; must be set before build since Next.js inlines it at build time) |

`NODE_ENV` is set to `production` automatically by Vercel on production deploys; it is not set manually.

## Migrations against production

Migrations are run by hand from a developer machine against the Neon database, using the direct (non-pooled) connection string from Neon's Connect dialog.

```powershell
Set-Location C:\Users\percision\Projects\support-desk

$sec = Read-Host "Neon connection string" -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new("", $sec).Password

if ($env:DATABASE_URL -notmatch "^postgres(ql)?://") { Remove-Item Env:DATABASE_URL; throw "Not a postgresql:// string" }
$h = ([uri]$env:DATABASE_URL).Host
$h
if ($h -notlike "*.neon.tech") { Remove-Item Env:DATABASE_URL; throw "Host is not neon.tech" }

npm run migration:run
Remove-Item Env:DATABASE_URL
```

Only the project owner (SafiAhm313) runs migrations against production. Verify the host printed by the script ends in `neon.tech` before confirming anything.

## Rollback

Both API and client are rolled back the same way, since both are deployed by Vercel from git history:

1. Open the project in Vercel (`support-desk` or `support-desk-client`) -> **Deployments**.
2. Find the most recent deployment on `main` that was working, before the bad one.
3. Open its "..." menu -> **Promote to Production**.

This makes that build live again immediately, with no new git push and no rebuild. The bad commit is still on `main` and should be fixed and merged separately; the promoted deployment is a stopgap, not a revert of the branch.

To instead roll back by reverting the code: `git revert <bad commit sha>` on `main`, push, and let the normal auto-deploy pick it up.

## Logs

Both projects: open the project in Vercel -> **Logs**. Filter by time range and, if needed, by status code or route. Logs are retained per Vercel's plan limits; for anything older, check GitHub's Actions history for the corresponding CI run instead.

## Rate limit

5 failed logins to the same email in a 15 minute window returns 429. Counted in Postgres (`login_attempts` table), not in memory, so the limit holds even though the API runs as a serverless function with no state shared between invocations.

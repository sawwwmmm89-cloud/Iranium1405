# BAMA — local setup

Run every command **inside this folder** (the one containing `package.json`, `tsconfig.json`, `src/`, `prisma/`).
If a `package-lock.json` exists in a parent folder (e.g. `C:\Users\<you>`), it is not part of this project.

1. `copy .env.example .env` and fill the values (see below). Never commit `.env`.
2. `npm install`
3. `npx prisma validate` → `npx prisma generate`
4. `npx prisma migrate dev --name init` (needs a reachable PostgreSQL)
5. `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`

Required environment variables (Phase 1): `DATABASE_URL` (PostgreSQL connection string), `AUTH_SECRET` (random, at least 32 characters), `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`).
Others in `.env.example` (Redis, Zarinpal, Eron, live provider) are not used until later phases.

## More docs
`IMPLEMENTATION_STATUS.md` (what is real vs. unverified), `docs/DATABASE_MIGRATIONS.md`, `docs/STORAGE.md`, `docs/PAYMENTS.md`, `docs/SMS.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/ACCEPTANCE_CHECKLIST.md`.
Scripts: `scripts/verify-all.ps1` (Windows, read-only verification report), `scripts/api-smoke.mjs` (HTTP smoke test).

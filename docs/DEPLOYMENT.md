# Deployment (Liara or any Node host)

1. Provision PostgreSQL and a private S3-compatible bucket; set every variable from `.env.example` in the host's secret store (never in Git).
2. Build: `npm ci && npx prisma generate && npm run build` (output is `standalone`). Run `npx prisma migrate deploy` **after** the backup described in `docs/DATABASE_MIGRATIONS.md`. Start with `npm start`.
3. Put the app behind HTTPS (cookies are `Secure` in production). Set the proxy body limit ≥ `MAX_UPLOAD_BYTES` and forward `X-Forwarded-For`.
4. First admin: register through the UI, then promote that user directly in the database (`UPDATE "User" SET role='SUPER_ADMIN' WHERE email='…'`). There is intentionally no public endpoint for this.
5. Create at least one `Instructor` and one `Category` row (no admin UI yet) before creating courses.
6. Smoke tests: `npm run smoke:api` (admin API), upload/download (see STORAGE.md), sandbox payment (see PAYMENTS.md).
7. Rate limits are in-memory per instance; with several instances use a shared store (Redis) before relying on them.

## Rollback
Redeploy the previous build; if a migration was applied, restore the pre-deploy dump into a fresh database and repoint `DATABASE_URL` (no automatic down-migrations). Soft-deleted data is never physically removed by the app.

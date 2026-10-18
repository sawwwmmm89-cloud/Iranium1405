# Acceptance checklist

Tick only what **you** have run. The author could not run any command (no network/database in the build sandbox).

## Tooling
- [ ] `npm ci` (or `npm install`) succeeds (adds `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- [ ] `npx prisma validate` · `npx prisma generate`
- [ ] backup taken and verified (`docs/DATABASE_MIGRATIONS.md`), migrations created and applied; `migrate status` is clean; rating CHECK applied
- [ ] `npm run typecheck` · `npm run lint` · `npm test` · `npm run build`
- [ ] integration tests: `TEST_DATABASE_URL=<disposable db> npm test`
- [ ] `npm run smoke:api` against a running build (admin API over real HTTP)

## Features (manual)
- [ ] register/login/logout; dashboard & admin route protection; suspended user is logged out
- [ ] admin: course/section/lesson CRUD, reorder, publish, duplicate; users role/suspend
- [ ] free course enroll; progress saved; paid course cannot be opened without enrollment
- [ ] attachments: upload PDF/PNG as admin and as owning instructor (API); forged file rejected; enrolled student downloads via signed URL; non-enrolled gets 403; URL expires
- [ ] sandbox payment end-to-end; callback replay is harmless; cancel leaves order pending
- [ ] blog: draft invisible publicly; publish; comment → pending → approve → visible; `<script>` in comment/content renders as text
- [ ] live: create class, free enroll, capacity limit; paid class via order; "provider not configured" shown (no vendor integrated)

## Not done (see IMPLEMENTATION_STATUS.md)
Instructor panel UI, category/instructor admin, reviews/media/settings admin pages, SMS vendor adapter, live vendor integration, DRM video (Eron) integration, phone verification, Redis rate limiting, virus scanning, CSP.

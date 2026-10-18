# IMPLEMENTATION_STATUS

Honesty note: this code was written in a sandbox with **no network and no database**. Nothing here has been installed, type-checked, linted, built, migrated or run against Postgres/S3/ZarinPal. What *was* executed: a syntax-only parse of all 200 TS/TSX files, and Node assertions against the pure modules (file policy, rate limiter, safe Markdown, phone normaliser, ZarinPal client with a fake `fetch`) — 19/19 passed after two bugs were found and fixed. Everything else is **written but unverified**. Run the checklist in `docs/ACCEPTANCE_CHECKLIST.md`.

## Completed (code written; unit tests written, not executed)
| Area | Files (main) |
|---|---|
| tsconfig excludes `backup-*` | `tsconfig.json` |
| Private storage + attachments (multiple per lesson), access control, signed downloads, purge | `src/server/storage/*`, `src/server/modules/{access,attachments}/*`, routes `…/lessons/[id]/attachments*`, `…/admin/attachments*`, UI `components/admin/attachments-panel.tsx` |
| Free enroll, lesson progress | `api/v1/courses/[id]/enroll`, `api/v1/lessons/[id]/progress` |
| Orders + ZarinPal create/callback/verify, idempotent settle, enrollment on paid | `src/server/modules/{orders,payments}/*`, `src/server/providers/payment/*`, routes `api/v1/orders`, `api/v1/payments/zarinpal/*`, buttons `components/commerce/*` |
| SMS service (adapter interface, dedupe, retry, rate limit) — no vendor | `src/server/modules/sms/*`, `src/server/providers/sms/*` |
| Blog (public pages, admin posts/comments, safe rendering, moderation) | `src/lib/safe-markdown.ts`, `src/server/modules/blog/*`, `app/(public)/blog/*`, `app/(admin)/admin/blog/*` |
| Live classes: admin CRUD/status, enroll (capacity-locked), access endpoint, provider interface — no vendor | `src/server/modules/live/*`, `src/server/providers/live/*`, `app/(admin)/admin/live`, `api/v1/live/*` |
| Admin orders/payments read-only pages, nav links | `app/(admin)/admin/{orders,payments}` |
| Schema: `LessonAttachment`, `BlogPost`, `BlogComment`, `SmsMessage` (+enums) | `prisma/schema.prisma` (**no migration generated**) |
| Docs | `docs/{DATABASE_MIGRATIONS,STORAGE,PAYMENTS,SMS,SECURITY,DEPLOYMENT,ACCEPTANCE_CHECKLIST}.md`, `.env.example` |
| Tests (not executed) | `tests/phase3/*` (+ earlier `tests/phase2/*`, `tests/integration/*`) |

## Not done / limitations
- **Migrations**: none generated (needs Prisma + DB). Procedure documented.
- **Instructor UI** and instructor CSRF cookie (middleware issues it for `/admin` only; instructors cannot enter `/admin`). Instructor-owned upload works at API level only if the client sends the CSRF cookie/header.
- Admin pages still placeholders: categories, instructors, reviews, media, settings. Reviews feature (UI/API) not built.
- SMS vendor adapter, Live vendor integration, DRM video/Eron: not integrated (interfaces only; reported as "needs configuration").
- Phone verification/OTP, Redis-backed rate limiting, virus scanning, CSP, password reset, refunds, payment reconciliation job, blog categories as entities and storage-backed cover images, SEO sitemap/structured data for new pages.
- Zarinpal request/verify field names are from public SDK mirrors of the official docs; confirm in sandbox.
- Eron: the `ERON_*` variables are unused; no secure-video playback was implemented in this pass.

## Bugs found by the executed checks (fixed)
ZarinPal client treated a success code (100) with a malformed body as a *refusal* — on `verify` that would have marked a charged payment FAILED. Now it is "unknown" (stays pending).

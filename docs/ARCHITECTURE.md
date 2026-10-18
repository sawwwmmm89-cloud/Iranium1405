# BAMA — Architecture

## Overview
Modular monolith on Next.js 15 (App Router). Server Components by default; Client Components only for interactivity (player, forms, admin tables).

## Layers
```
src/
├── app/                 # routes (public, (student)/dashboard, (admin)/admin, api/v1)
├── components/          # ui/ (design system), features/ (CourseCard, LiveCard, ...)
├── server/
│   ├── modules/         # auth, courses, orders, payments, enrollments, live, progress, users
│   │   └── <module>/    # *.service.ts, *.repository.ts, *.schema.ts (Zod), *.types.ts
│   ├── providers/
│   │   ├── payment/     # PaymentProvider -> ZarinpalProvider
│   │   ├── video/       # VideoProvider  -> EronProvider
│   │   └── live/        # LiveProvider   -> (TBD vendor)
│   ├── security/        # session, csrf, rbac, rate-limit, audit
│   ├── db/              # prisma client singleton
│   ├── cache/           # redis client + helpers
│   └── errors/          # AppError, centralized handler, response envelope
├── lib/                 # env (Zod-validated), utils, constants
└── styles/              # tokens, globals
prisma/ schema.prisma, migrations, seed.ts
```

## Principles
- Route Handler = thin: parse (Zod) → authorize (RBAC) → call service → envelope response.
- Services hold business logic; repositories hold Prisma queries. Money/enrollment flows run in `prisma.$transaction`.
- Providers are interfaces so Eron / live vendor / gateway are swappable.
- Env is validated once at boot (`lib/env.ts`); server secrets never imported in client code (`server-only`).
- Response envelope: `{ success, data?, error?: { code, message, details? }, meta? }`.

## Key flows
- **Purchase**: create Order(PENDING) → Payment(INITIATED) + Zarinpal request → store authority → redirect → callback → server-side verify → in one transaction: Payment=PAID (ref_id), Order=PAID, Enrollment upsert. Repeat callbacks are no-ops (unique authority + status guard).
- **Video access**: `/courses/:id/access` + lesson endpoint check enrollment (or free preview) → VideoProvider returns short-lived signed playback token/embed config → client never sees raw video ID/secrets.
- **Live access**: same pattern with LiveEnrollment + state check.

## Deployment (Liara)
Dockerized Next.js (standalone output), managed PostgreSQL + Redis, env via Liara dashboard, `prisma migrate deploy` on release.

## Roadmap
| Phase | Scope |
|---|---|
| 1 | Setup, docs, design system, Prisma schema, auth (Argon2id sessions, RBAC) |
| 2 | Admin: courses, sections/lessons, users |
| 3 | Public pages, student dashboard, player, progress |
| 4 | Orders, Zarinpal, enrollment |
| 5 | Eron integration |
| 6 | Live classes |
| 7 | SEO, perf, hardening, tests, deploy |

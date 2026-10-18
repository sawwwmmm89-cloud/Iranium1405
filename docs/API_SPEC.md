# BAMA — API Spec (/api/v1)

Envelope: `{ "success": true, "data": ..., "meta": {...} }` or `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.
Status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.

> **Implemented in Phase 1:** auth/register, auth/login, auth/logout, auth/me (alias of /me), /me, /me/courses, /courses, /courses/:id (accepts UUID **or** slug — one dynamic segment, since Next.js forbids sibling [id]/[slug]), /courses/:id/lessons, /courses/:id/access. Everything else is tagged with its phase.

## Auth
POST /auth/register · POST /auth/login · POST /auth/logout · GET /auth/me (+ GET /me)
## Catalog
GET /courses (q, category, level, page) · GET /courses/:slug
## Commerce
[Phase 4] POST /orders · GET /orders
[Phase 4] POST /payments/zarinpal/create · GET /payments/zarinpal/callback · POST /payments/zarinpal/verify
## Learning
GET /me/courses · GET /courses/:id/access · GET /courses/:id/lessons · [Phase 3/5] GET /lessons/:id/playback · POST /lessons/:id/progress
## Live
[Phase 6] GET /live · GET /live/:id · POST /live/:id/enroll · GET /live/:id/playback
## Admin [Phase 2+] (ADMIN/SUPER_ADMIN)
/admin/courses (CRUD, publish, duplicate, reorder) · /admin/users (list, role, suspend) · /admin/orders · /admin/payments · /admin/live

Conventions: Zod validation on every input; CSRF token (double-submit) on cookie-authenticated mutating routes; rate limits — login 5/min/IP+identifier, payment 10/min/user; every admin mutation writes AuditLog.

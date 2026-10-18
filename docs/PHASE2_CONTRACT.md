# Phase 2 contract (confirmed decisions)

Scope: admin courses (CRUD, sections, lessons, publish/unpublish, duplicate, reorder) and admin users (list, role, suspend/activate).
Out of scope: ARCHIVED, Category/Instructor management, media/upload, seed.ts, schema changes, new dependencies.

**Status transitions:** DRAFT <-> PUBLISHED only. ARCHIVED courses return 409 INVALID_STATE. Repeating the current state is a no-op (no audit row).
**Duplicate:** new DRAFT course, `featured=false`, title `"<title> (کپی)"`, new unique slug, sections + non-deleted lessons copied with their `order`. Enrollments/orders/reviews/progress are not copied. One transaction, `course.duplicate` audit.
**Section delete:** conditional single-statement DELETE that only matches a section with zero lesson rows (soft-deleted lessons count). Otherwise 409 SECTION_NOT_EMPTY. No cascade.
**CSRF:** cookie `bama_csrf` (not HttpOnly, Secure in production, SameSite=Lax, issued by middleware on /admin pages) + header `X-CSRF-Token`, checked on POST/PUT/PATCH/DELETE of admin routes via `adminRoute()`. Origin check kept. Login/register are NOT covered by CSRF tokens (Origin + SameSite=Lax only) — unchanged, reported.
**Slug:** Unicode-preserving, ZWNJ/space/punctuation -> `-`, Latin lowercased, Arabic ي/ك -> ی/ک, max 120, collisions `-2`, `-3`, empty -> `course`. Globally unique (soft-deleted rows keep their slug). PATCH never changes it.
**Validation:** Zod `.strict()` schemas; prices/durations integer 0..INT4_MAX; `discountPrice <= price` (also checked against stored values on PATCH); URLs http(s) or root-relative only. String limits are in `course.schema.ts` `LIMITS` (schema.prisma defines none).
**Users:** list = ADMIN + SUPER_ADMIN (API_SPEC lists the Admin section as ADMIN/SUPER_ADMIN and does not restrict it); role change/suspend/activate = SUPER_ADMIN only, never on yourself, last active SUPER_ADMIN protected (row lock), suspend revokes all active sessions.
**Audit actions:** course.create/update/delete/publish/unpublish/duplicate/reorder, section.create/update/delete, lesson.create/update/delete/reorder, user.role_change/suspend/activate. Written inside the same transaction as the mutation (failure rolls the mutation back).

# Security (as implemented)

Everything below is **code-reviewed and unit-tested with mocks, not penetration-tested**. Items marked ✗ are not implemented.

## Authentication & sessions
Argon2id; random 256-bit session token in an HttpOnly, SameSite=Lax cookie (Secure in production); only an HMAC-SHA256 (keyed with `AUTH_SECRET`) of the token is stored; 30-day expiry; revocation on logout and on suspension; suspended/deleted users are rejected on every request. Login/register: Origin check + SameSite only (no CSRF token). ✗ password reset, ✗ MFA, ✗ shared (Redis) rate limiting for login.

## Authorization
Enforced server-side in route handlers/services (UI hiding is cosmetic): `adminRoute()` = Origin check → session + role → CSRF (`bama_csrf` cookie + `X-CSRF-Token`) for mutating methods. Roles: user management mutations = SUPER_ADMIN only (never on yourself, last active SUPER_ADMIN protected, suspension revokes sessions). Lesson/attachment access = `resolveLessonAccess` (manager, or published lesson in published course AND free preview/enrolled). Instructors manage only courses linked to their `Instructor.userId`.

## Files
Magic-byte allowlist (PDF/PNG/JPEG/WEBP), size limit (header pre-check + actual size), random object keys, private bucket, short-lived signed URLs forced to `attachment`, audit trail. ✗ malware scanning.

## Payments
Amount computed from the DB; success only after server-side gateway verify; idempotent claim/finalise; unknown outcomes never marked paid/failed; audited. Callback/verify/create are rate-limited (in-memory).

## Content
Blog bodies are a Markdown **subset rendered as React elements** (no raw HTML, no `dangerouslySetInnerHTML`); links limited to http(s)/relative with `rel=noopener noreferrer nofollow ugc`; comments are plain text, PENDING until approved; drafts are invisible to the public. Cover images are external URLs (http/https only) — a remote image can leak the reader's IP to its host.

## Other
Secrets only via environment (lazy validation, `server-only` imports); structured JSON logs; unexpected errors return a request id, never internals; all admin mutations write `AuditLog` inside the same transaction. Security headers set in `next.config.mjs` (✗ CSP not configured). Known limits: in-memory rate limiter is per instance; CSRF cookie is not bound to the session.

# Private file storage (lesson attachments)

**State:** implemented and unit-tested with a mocked storage layer; **never exercised against a real bucket** (no credentials were available). Until the variables below are set, upload/download return `503 STORAGE_NOT_CONFIGURED`.

## Setup
1. Create a **private** bucket at your S3-compatible provider (e.g. Liara Object Storage). Do NOT enable public read / static hosting.
2. Create an access key limited to that bucket (read, write, delete).
3. Set `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_FORCE_PATH_STYLE` (usually `true`), `STORAGE_SIGNED_URL_TTL_SECONDS`, `MAX_UPLOAD_BYTES` (see `.env.example`).
4. `npm install` (adds `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).

## Smoke test (do this once configured)
Admin → edit a course → open a lesson → "ویرایش" → upload a PDF. Then as an enrolled student open the course room and click the file. Expected: a 302 to a signed URL that downloads the file and stops working after the TTL. Verify in the provider console that the bucket has no public access and that object keys look like `lessons/<lessonId>/<uuid>.pdf`.

## Behaviour
- Allowed: PDF, PNG, JPEG, WEBP, detected from **magic bytes** (declared MIME/extension must agree). SVG/HTML/Office/archives are rejected.
- Key = `lessons/<lessonId>/<random uuid>.<ext>`; the user's file name is only a display name.
- Downloads are always `attachment` (never inline) via a short-lived signed URL; the storage key is never sent to clients.
- Upload: ADMIN/SUPER_ADMIN, or an INSTRUCTOR who owns the course (server-side check). Download: manager, or enrolled student of a published lesson/course, or free-preview lesson.
- Limits: `MAX_UPLOAD_BYTES` (also checked via `Content-Length` before the body is read), 20 attachments per lesson, 20 uploads/min/user, 60 downloads/min/user (in-memory limiter, per instance).
- Delete = soft delete + best-effort object removal; leftovers are retried with `POST /api/v1/admin/attachments/purge` (SUPER_ADMIN). All actions are in `AuditLog` (`attachment.upload|delete|purge`).
- Infrastructure limits still apply: set the reverse proxy body limit (e.g. nginx `client_max_body_size`) at or above `MAX_UPLOAD_BYTES`.
- Not implemented: virus scanning, image re-encoding, resumable/large uploads (> `MAX_UPLOAD_BYTES`), blog cover images in storage (cover images are plain http(s) URLs).

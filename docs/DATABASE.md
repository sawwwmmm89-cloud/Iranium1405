# BAMA — Database (PostgreSQL + Prisma)

UUID PKs, `createdAt/updatedAt` everywhere, `deletedAt` (soft delete) on User, Course, Lesson, LiveClass, Review. Money stored as integer Rial/Toman (no floats).

## Entities
- **User**(id, email (required, unique; login identifier in Phase 1), phone? (unique), passwordHash, name, avatar, role, status[ACTIVE|SUSPENDED], deletedAt)
- **Session**(id, userId, tokenHash, userAgent, ip, expiresAt, revokedAt) — only a hash of the token is stored
- **Instructor**(id, userId?, name, bio, avatar, slug)
- **Category**(id, name, slug, parentId?)
- **Course**(id, slug UNIQUE, title, shortDesc, description, thumbnail, cover, price, discountPrice?, instructorId, categoryId, level, durationMin, status[DRAFT|PUBLISHED|ARCHIVED], featured, seoTitle, seoDescription)
- **CourseSection**(id, courseId, title, order) — UNIQUE(courseId, order)
- **Lesson**(id, sectionId, title, description, videoProvider, videoRef, durationSec, order, isFreePreview, attachmentUrl?, status) — UNIQUE(sectionId, order)
- **Order**(id, userId, status[PENDING|PAID|FAILED|CANCELLED|REFUNDED], totalAmount, currency)
- **OrderItem**(id, orderId, courseId? | liveClassId?, unitPrice, discount)
- **Payment**(id, orderId, userId, provider, authority UNIQUE, refId?, amount, status[INITIATED|PAID|FAILED|VERIFY_PENDING], rawVerifyResponse JSON, paidAt?)
- **Enrollment**(id, userId, courseId, orderId?, source[PURCHASE|ADMIN|FREE]) — **UNIQUE(userId, courseId)**
- **Progress**(id, userId, lessonId, completed, watchedSec, completedAt) — UNIQUE(userId, lessonId)
- **LiveClass**(id, title, description, instructorId, thumbnail, startsAt, durationMin, capacity, price, status[SCHEDULED|LIVE|FINISHED|CANCELLED], providerRef)
- **LiveEnrollment**(id, userId, liveClassId, orderId?) — UNIQUE(userId, liveClassId)
- **Review**(id, userId, courseId, rating 1–5 [DB CHECK constraint added in migration SQL], body, status[PENDING|APPROVED|REJECTED]) — **UNIQUE(userId, courseId)**
- **AuditLog**(id, actorId?, action, entity, entityId, metadata JSON, ip, createdAt)

## Indexes
Course(status, featured), Course(categoryId), Lesson(sectionId, order), Order(userId, createdAt), Payment(orderId), Enrollment(userId), AuditLog(entity, entityId), Session(userId, expiresAt).

## Transaction rules
1. Payment verification + Order/Payment update + Enrollment creation are one `$transaction` with row lock on the Payment (`SELECT ... FOR UPDATE`) or status-guarded `updateMany` (count must be 1).
2. Capacity check for live enrollment inside the transaction.
3. Duplicate callbacks hit unique constraints / status guards and return the existing result.

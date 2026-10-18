# Database & migrations

**Status (honest):** this repository has **no `prisma/migrations` folder**. No migration was generated or executed by the author of this code (the build sandbox had no database and no network). `prisma/schema.prisma` is the source of truth; every command below must be run by you.

## Schema additions since Phase 2 (all additive, no existing column changed)
`LessonAttachment`, `BlogPost`, `BlogComment`, `SmsMessage` and enums `SmsStatus`, `PostStatus`, `CommentStatus`; back-relation fields on `User` and `Lesson` (no DB column). Earlier additions: `Enrollment.source`, `Review.status`, `Payment.rawVerifyResponse`.

## Golden rules
Never run `prisma migrate reset`, `prisma db push --accept-data-loss` or drop tables on a database that holds real data. Always take and verify a backup first.

## 0. Backup (before anything)
```
pg_dump -Fc -f bama-backup-YYYYMMDD.dump "<DATABASE_URL>"
pg_restore --list bama-backup-YYYYMMDD.dump | head     # proves the dump is readable
```
Restore-test it into a scratch database at least once.

## 1. Inspect (read-only)
```
npx prisma validate
npx prisma migrate status
npx prisma migrate diff --from-url "<DATABASE_URL>" --to-schema-datamodel prisma/schema.prisma --script
```
The last command prints the SQL needed to bring the database to the schema: **read it** and confirm it only creates things.

## 2a. Empty database (new install)
```
npx prisma migrate dev --name init        # creates prisma/migrations/<ts>_init
```
Then add the rating constraint (step 3).

## 2b. Existing database without migration history (baseline, no data touched)
```
mkdir prisma\migrations\0_init
npx prisma migrate diff --from-empty --to-url "<DATABASE_URL>" --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init          # marks it applied, runs nothing
npx prisma migrate dev --name phase3_content          # on a COPY/dev DB: generates the incremental SQL for the new tables
```
Review `phase3_content/migration.sql` (must be CREATE TYPE/CREATE TABLE/CREATE INDEX/ALTER TABLE ... ADD only), then deploy to production with `npx prisma migrate deploy`.

## 3. Review rating CHECK constraint
Prisma cannot express it. Create an empty migration and edit the SQL:
```
npx prisma migrate dev --create-only --name review_rating_check
```
```sql
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
```
Apply with `npx prisma migrate dev` (dev) / `migrate deploy` (prod). If existing rows violate it the statement fails loudly: fix data first.

## 4. Verify
`npx prisma migrate status` must report "Database schema is up to date", `npx prisma generate`, then `npm test` with `TEST_DATABASE_URL` pointing at a **disposable** database.

## Rollback
Restore the dump (`pg_restore --clean --if-exists -d <db> dump`) into a fresh database and repoint `DATABASE_URL`. Prisma has no automatic down-migrations.

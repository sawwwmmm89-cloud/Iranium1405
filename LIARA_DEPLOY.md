# راهنمای جامع دیپلوی پروژه باما (BAMA) روی پلتفرم لیارا (Liara)

این پروژه با **Next.js 15 (App Router)**، **TypeScript** و **Prisma ORM** توسعه یافته و برای دیپلوی در هاست ابری **لیارا (Liara)** کاملاً بهینه‌سازی و پیکربندی شده است.

---

## ۱. پیش‌نیازها در پنل لیارا

قبل از اجرای پروژه، در پنل کاربری لیارا موارد زیر را ایجاد کنید:
1. **دیتابیس PostgreSQL**:
   - یک دیتابیس PostgreSQL جدید ایجاد کنید.
   - رشته اتصال (`DATABASE_URL`) را از بخش اطلاعات دیتابیس کپی کنید.
2. **برنامه (App)**:
   - یک برنامه با پلتفرم **NodeJS** (یا Docker) ایجاد کنید (نام دلخواه، مثلاً `bama-app`).
3. **ذخیره‌سازی ابری (Object Storage)** *(اختیاری - برای آپلود و دانلود فایل‌ها)*:
   - یک باکت خصوصی در فضای ذخیره‌سازی ابری لیارا (S3-compatible) بسازید و کلیدهای دسترسی (Access Key / Secret Key) را یادداشت کنید.

---

## ۲. متغیرهای محیطی (Environment Variables)

در پنل لیارا -> برنامه شما -> بخش **تنظیمات** -> **متغیرهای محیطی**، متغیرهای زیر را وارد کنید:

### متغیرهای ضروری:
```env
# رشته اتصال به دیتابیس پستگرس لیارا
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# کلید امنیتی نشست‌ها (حداقل ۳۲ کاراکتر تصادفی)
AUTH_SECRET=a_very_secure_random_secret_key_at_least_32_chars_long

# آدرس دامنه عمومی سایت شما (بدون اسلش انتهایی)
NEXT_PUBLIC_APP_URL=https://bama-app.liara.run

# محیط اجرایی
NODE_ENV=production
PORT=3000
```

> **نکته تولید کلید تصادفی AUTH_SECRET**:
> در ترمینال سیستم خود می‌توانید این دستور را برای ساخت کلید اجرا کنید:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
> ```

### متغیرهای ذخیره‌سازی ابری لیارا (S3 Storage) - در صورت نیاز:
```env
STORAGE_ENDPOINT=https://storage.iran.liara.space
STORAGE_REGION=us-east-1
STORAGE_BUCKET=your-bucket-name
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_FORCE_PATH_STYLE=true
STORAGE_SIGNED_URL_TTL_SECONDS=120
MAX_UPLOAD_BYTES=20971520
```

### متغیرهای درگاه زرین‌پال - در صورت نیاز:
```env
ZARINPAL_MERCHANT_ID=your-merchant-id-or-empty
ZARINPAL_SANDBOX=false
```

---

## ۳. روش‌های دیپلوی روی لیارا

### روش اول: دیپلوی مستقیم از طریق Liara CLI (پیشنهادی)

1. نصب Liara CLI روی سیستم:
   ```bash
   npm i -g @liara/cli
   ```
2. ورود به حساب کاربری لیارا:
   ```bash
   liara login
   ```
3. رفتن به پوشه پروژه (`bama`) و اجرای دستور دیپلوی:
   ```bash
   liara deploy
   ```
   *پروژه به صورت خودکار فایل‌های اضافی مثل `node_modules` و `.next` را بر اساس `.liaraignore` نادیده می‌گیرد و پکیج بهینه‌شده را روی سرور لیارا بیلد می‌کند.*

---

### روش دوم: دیپلوی با استفاده از داکر (Docker)
اگر تمایل دارید پروژه دقیقاً با لایه‌های داکر روی لیارا اجرا شود:
1. در فایل `liara.json`، مقدار `platform` را به `"docker"` تغییر دهید:
   ```json
   {
     "platform": "docker",
     "app": "bama-app",
     "port": 3000
   }
   ```
2. دستور `liara deploy` را اجرا کنید. پروژه از طریق `Dockerfile` چندمرحله‌ای (Multi-stage) و فوق‌سبک ساخته و اجرا می‌شود.

---

## ۴. اجرای مایگریشن‌ها و ایجاد کاربر مدیر ارشد (Super Admin)

پس از اولین دیپلوی، جداول دیتابیس باید ساخته شوند و حساب مدیر ارشد ایجاد شود.

### گام اول: اجرای مایگریشن دیتابیس
در بخش «خط فرمان» (Console) برنامه در پنل لیارا یا از طریق دستور:
```bash
npx prisma migrate deploy
```
تمام جداول (شامل کاربران، دوره‌ها، جلسات، وبلاگ، نظرات، پیوست‌ها و ...) ساخته می‌شوند.

### گام دوم: ایجاد مدیر ارشد و داده‌های اولیه
یک اسکریپت آماده با عنوان `db:seed` در پروژه تعبیه شده است:
```bash
npm run db:seed
```
یا:
```bash
node scripts/seed.mjs
```

این اسکریپت به صورت خودکار:
1. حساب کاربری **مدیر ارشد (SUPER_ADMIN)** را با مشخصات پیش‌فرض زیر می‌سازد:
   - **ایمیل:** `admin@bama.ir`
   - **رمز عبور:** `Admin@123456`
2. پروفایل مدرس پیش‌فرض برای مدیر را فعال می‌کند.
3. یک دسته‌بندی پیش‌فرض (برنامه‌نویسی و توسعه وب) ایجاد می‌کند.

*(می‌توانید رمز عبور و ایمیل دلخواه را نیز از طریق متغیرهای `ADMIN_INITIAL_EMAIL` و `ADMIN_INITIAL_PASSWORD` ارسال نمایید)*.

---

## ۵. دسترسی به پنل ادمین
- آدرس ورود: `/login`
- آدرس پنل مدیریت: `/admin`
- پس از ورود با حساب `admin@bama.ir`، به بخش‌های مدیریت دوره‌ها، فصل‌ها، جلسات، وبلاگ، کاربران و نظرات دسترسی کامل خواهید داشت.

---

## ۶. بررسی سلامت و تست‌های پروژه

کلیه تست‌ها و اعتبارسنجی‌ها قبل از انتشار با موفقیت کامل پاس شده‌اند:
- تست تایپ‌ها: `npm run typecheck` (بدون خطا)
- بررسی استاندارد کد: `npm run lint` (بدون خطا و هشدار)
- تست‌های واحد (Unit Tests): `npm test` (۱۶۱ تست موفق)
- بیلد پروداکشن: `npm run build` (موفق)

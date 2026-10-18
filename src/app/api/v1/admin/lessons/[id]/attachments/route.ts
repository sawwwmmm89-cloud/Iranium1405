import { getMaxUploadBytes } from '@/lib/env';
import { assertRateLimit } from '@/lib/rate-limit';
import { AppError } from '@/server/errors/app-error';
import { ok } from '@/server/errors/route';
import { uploadAttachment } from '@/server/modules/attachments/attachments.service';
import { adminRoute, clientIp } from '@/server/security/admin-route';

const MULTIPART_OVERHEAD = 64 * 1024;

// ADMIN, SUPER_ADMIN and INSTRUCTOR may call this; the service enforces course ownership for instructors.
export const POST = adminRoute<{ params: Promise<{ id: string }> }>(
  { roles: ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'] },
  async (req, { params }, user) => {
    assertRateLimit(`upload:${user.id}`, 20, 60_000);
    const declaredLength = Number(req.headers.get('content-length') ?? '0');
    if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
      throw new AppError(411, 'LENGTH_REQUIRED', 'طول درخواست مشخص نیست.');
    }
    if (declaredLength > getMaxUploadBytes() + MULTIPART_OVERHEAD) {
      throw new AppError(413, 'FILE_TOO_LARGE', 'حجم درخواست بیش از حد مجاز است.');
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError(400, 'BAD_MULTIPART', 'درخواست باید multipart/form-data معتبر باشد.');
    }
    const file = form.get('file');
    if (!(file instanceof File)) throw new AppError(422, 'FILE_REQUIRED', 'فیلد file الزامی است.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const row = await uploadAttachment(user, (await params).id, { name: file.name, declaredMime: file.type || undefined, bytes }, clientIp(req));
    return ok(row, 201);
  },
);

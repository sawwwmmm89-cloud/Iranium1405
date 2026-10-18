import { AppError } from '@/server/errors/app-error';

/**
 * Allowlist. Add a type only after a security review: it needs (1) a magic-byte signature below,
 * (2) a safe inline/attachment story, (3) no active-content format (SVG, HTML, Office macros...).
 */
export const ALLOWED_TYPES = {
  'application/pdf': { ext: ['pdf'], label: 'PDF' },
  'image/png': { ext: ['png'], label: 'PNG' },
  'image/jpeg': { ext: ['jpg', 'jpeg'], label: 'JPEG' },
  'image/webp': { ext: ['webp'], label: 'WEBP' },
} as const;

export type AllowedMime = keyof typeof ALLOWED_TYPES;

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

/** Real type from file content; the client-declared MIME and extension are never trusted. */
export function detectMime(bytes: Uint8Array): AllowedMime | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

/** Display name only (Content-Disposition). Never used as a storage key. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}._ -]+/gu, '_')
    .replace(/^\.+/, '')
    .trim();
  const limited = Array.from(cleaned).slice(0, 120).join('');
  return limited || 'file';
}

export interface ValidatedUpload {
  mime: AllowedMime;
  ext: string;
  displayName: string;
  sizeBytes: number;
}

export function validateUpload(input: {
  name: string;
  declaredMime: string | undefined;
  bytes: Uint8Array;
  maxBytes: number;
}): ValidatedUpload {
  const { bytes, maxBytes } = input;
  if (bytes.byteLength === 0) throw new AppError(422, 'EMPTY_FILE', 'فایل خالی است.');
  if (bytes.byteLength > maxBytes) {
    throw new AppError(413, 'FILE_TOO_LARGE', `حجم فایل بیش از حد مجاز (${Math.floor(maxBytes / 1024 / 1024)} مگابایت) است.`);
  }
  const mime = detectMime(bytes);
  if (!mime) throw new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'نوع فایل مجاز نیست. فقط PDF، PNG، JPEG و WEBP پذیرفته می‌شود.');
  if (input.declaredMime && input.declaredMime !== mime) {
    throw new AppError(415, 'MIME_MISMATCH', 'نوع اعلام‌شدهٔ فایل با محتوای واقعی آن مطابقت ندارد.');
  }
  const displayName = sanitizeFileName(input.name);
  const nameExt = displayName.includes('.') ? displayName.split('.').pop()!.toLowerCase() : '';
  const allowedExts: readonly string[] = ALLOWED_TYPES[mime].ext;
  if (nameExt && !allowedExts.includes(nameExt)) {
    throw new AppError(415, 'EXTENSION_MISMATCH', 'پسوند فایل با نوع واقعی آن مطابقت ندارد.');
  }
  return { mime, ext: allowedExts[0]!, displayName, sizeBytes: bytes.byteLength };
}

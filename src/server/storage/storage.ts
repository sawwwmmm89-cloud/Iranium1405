import 'server-only';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStorageConfig } from '@/lib/env';
import { AppError } from '@/server/errors/app-error';

export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** Short-lived URL; forces download (never inline) with the given display name. */
  signedDownloadUrl(key: string, opts: { fileName: string; contentType: string }): Promise<string>;
}

class S3Storage implements ObjectStorage {
  private readonly client: S3Client;
  constructor(private readonly cfg: NonNullable<ReturnType<typeof getStorageConfig>>) {
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.byteLength,
        CacheControl: 'private, no-store',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }

  signedDownloadUrl(key: string, opts: { fileName: string; contentType: string }): Promise<string> {
    const encoded = encodeURIComponent(opts.fileName);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        ResponseContentType: opts.contentType,
        ResponseContentDisposition: `attachment; filename="download"; filename*=UTF-8''${encoded}`,
      }),
      { expiresIn: this.cfg.signedUrlTtlSeconds },
    );
  }
}

let instance: ObjectStorage | null | undefined;

/** null => storage is not configured (feature reports "needs configuration"). */
export function getStorage(): ObjectStorage | null {
  if (instance === undefined) {
    const cfg = getStorageConfig();
    instance = cfg ? new S3Storage(cfg) : null;
  }
  return instance;
}

export function requireStorage(): ObjectStorage {
  const s = getStorage();
  if (!s) throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'فضای ذخیره‌سازی فایل پیکربندی نشده است.');
  return s;
}

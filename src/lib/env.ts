import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

/** Lazily validated so `next build` does not need runtime secrets. Throws on first real use. */
export function getEnv(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}

/* ---------------- optional integrations: null => "needs configuration" ---------------- */

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  signedUrlTtlSeconds: number;
  maxUploadBytes: number;
}

const storageSchema = z.object({
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('true'),
  STORAGE_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(120),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).max(100 * 1024 * 1024).default(20 * 1024 * 1024),
});

/** Returns null unless every required STORAGE_* variable is set (never throws on absence). */
export function getStorageConfig(source: NodeJS.ProcessEnv = process.env): StorageConfig | null {
  const required = ['STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY'];
  if (required.some((k) => !source[k])) return null;
  const e = storageSchema.parse(source);
  return {
    endpoint: e.STORAGE_ENDPOINT,
    region: e.STORAGE_REGION,
    bucket: e.STORAGE_BUCKET,
    accessKeyId: e.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: e.STORAGE_SECRET_ACCESS_KEY,
    forcePathStyle: e.STORAGE_FORCE_PATH_STYLE === 'true',
    signedUrlTtlSeconds: e.STORAGE_SIGNED_URL_TTL_SECONDS,
    maxUploadBytes: e.MAX_UPLOAD_BYTES,
  };
}

/** Upload limit used by validation even when storage itself is not configured. */
export function getMaxUploadBytes(source: NodeJS.ProcessEnv = process.env): number {
  return storageSchema.shape.MAX_UPLOAD_BYTES.parse(source.MAX_UPLOAD_BYTES);
}

export interface ZarinpalConfig {
  merchantId: string;
  sandbox: boolean;
}

export function getZarinpalConfig(source: NodeJS.ProcessEnv = process.env): ZarinpalConfig | null {
  const merchantId = source.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) return null;
  return { merchantId, sandbox: source.ZARINPAL_SANDBOX === 'true' };
}

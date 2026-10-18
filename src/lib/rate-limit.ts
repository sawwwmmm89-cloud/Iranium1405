import 'server-only';
import { AppError } from '@/server/errors/app-error';

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-window limiter kept in process memory. It is per server instance: behind several
 * instances the effective limit multiplies, so use a shared store (Redis) for strict limits.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t > 3_600_000)) buckets.delete(k);
    }
  }
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export function assertRateLimit(key: string, limit: number, windowMs: number): void {
  const r = rateLimit(key, limit, windowMs);
  if (!r.ok) {
    throw new AppError(429, 'RATE_LIMITED', `تعداد درخواست‌ها زیاد است. ${r.retryAfterSeconds} ثانیه بعد تلاش کنید.`);
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}

import { beforeEach, describe, expect, it } from 'vitest';
import { assertRateLimit, rateLimit, resetRateLimits } from '@/lib/rate-limit';

beforeEach(() => resetRateLimits());

describe('rateLimit', () => {
  it('allows up to the limit then blocks with retry-after', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 1000, 0 + i).ok).toBe(true);
    const blocked = rateLimit('k', 3, 1000, 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
  it('recovers after the window and isolates keys', () => {
    for (let i = 0; i < 3; i++) rateLimit('a', 3, 1000, 0);
    expect(rateLimit('a', 3, 1000, 500).ok).toBe(false);
    expect(rateLimit('a', 3, 1000, 1001).ok).toBe(true);
    expect(rateLimit('b', 3, 1000, 500).ok).toBe(true);
  });
  it('assertRateLimit throws 429', () => {
    assertRateLimit('x', 1, 60_000);
    expect(() => assertRateLimit('x', 1, 60_000)).toThrowError(expect.objectContaining({ status: 429, code: 'RATE_LIMITED' }));
  });
});

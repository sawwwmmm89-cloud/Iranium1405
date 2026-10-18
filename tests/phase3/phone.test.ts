import { describe, expect, it } from 'vitest';
import { normalizeIranMobile } from '@/server/modules/sms/phone';

describe('normalizeIranMobile', () => {
  it('normalizes common formats and Persian digits', () => {
    for (const v of ['09123456789', '+989123456789', '989123456789', '00989123456789', '0912 345 6789', '۰۹۱۲۳۴۵۶۷۸۹']) expect(normalizeIranMobile(v)).toBe('09123456789');
  });
  it('rejects invalid numbers', () => {
    for (const v of ['', '0212345678', '0912345678', '091234567890', 'abc', '08123456789']) expect(normalizeIranMobile(v)).toBeNull();
  });
});

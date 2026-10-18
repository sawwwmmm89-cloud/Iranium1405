import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@/server/modules/auth/auth.schema';

describe('registerSchema', () => {
  it('normalizes email and accepts valid input', () => {
    const r = registerSchema.parse({ name: ' علی ', email: ' A@B.com ', password: '12345678' });
    expect(r.email).toBe('a@b.com');
    expect(r.name).toBe('علی');
  });
  it('rejects short passwords and bad emails', () => {
    expect(registerSchema.safeParse({ name: 'علی', email: 'x@y.com', password: '123' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'علی', email: 'nope', password: '12345678' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires a password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

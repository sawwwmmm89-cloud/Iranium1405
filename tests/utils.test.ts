import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';
import { AppError, errors } from '@/server/errors/app-error';

describe('cn', () => {
  it('joins truthy classes', () => expect(cn('a', false, 'b')).toBe('a b'));
});

describe('errors', () => {
  it('maps to HTTP statuses', () => {
    expect(errors.unauthorized().status).toBe(401);
    expect(errors.forbidden().status).toBe(403);
    expect(errors.notFound().status).toBe(404);
    expect(errors.conflict('x')).toBeInstanceOf(AppError);
  });
});

import 'server-only';
import { Prisma } from '@prisma/client';
import { errors } from '@/server/errors/app-error';

export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  if (!field) return true;
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.some((t) => String(t).includes(field));
  return typeof target === 'string' && target.includes(field);
}

/**
 * Re-runs the WHOLE operation (a failed statement aborts a PostgreSQL transaction,
 * so retrying inside it is impossible) when a concurrent writer wins a unique value.
 */
export async function retryOnUnique<T>(field: string, run: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await run();
    } catch (error) {
      if (!isUniqueViolation(error, field)) throw error;
    }
  }
  throw errors.conflict('به‌دلیل تغییر همزمان، عملیات انجام نشد. دوباره تلاش کنید.');
}

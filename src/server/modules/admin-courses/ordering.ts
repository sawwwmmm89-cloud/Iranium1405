import { AppError } from '@/server/errors/app-error';

/** Provided ids must be exactly the current set (no missing, extra or foreign ids). */
export function assertSameIds(provided: string[], current: string[]): void {
  const currentSet = new Set(current);
  const ok = provided.length === current.length && provided.every((id) => currentSet.has(id));
  if (!ok) {
    throw new AppError(422, 'REORDER_MISMATCH', 'فهرست ارسالی با موارد فعلی مطابقت ندارد.');
  }
}

/**
 * (parent, order) is UNIQUE and PostgreSQL checks it per statement, so swapping values
 * directly would collide. Phase 1 parks every row on a unique NEGATIVE value (real orders
 * are never negative), phase 2 writes the final 0..n-1 positions. Run inside a transaction.
 */
export async function applyOrder(
  ids: string[],
  update: (id: string, order: number) => Promise<unknown>,
): Promise<void> {
  for (const [i, id] of ids.entries()) await update(id, -(i + 1));
  for (const [i, id] of ids.entries()) await update(id, i);
}

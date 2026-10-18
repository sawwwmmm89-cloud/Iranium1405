import 'server-only';
import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { prisma } from '@/server/db/prisma';

interface AuditEntry {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}

/** Audit writes must never break the user flow, but failures are always logged. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (error) {
    logger.error('audit_write_failed', { action: entry.action, error });
  }
}

/**
 * Audit write that participates in the caller's transaction. Unlike recordAudit it
 * does NOT swallow errors: an admin mutation without its audit row must roll back.
 */
export function writeAudit(client: Prisma.TransactionClient, entry: AuditEntry) {
  return client.auditLog.create({ data: entry });
}

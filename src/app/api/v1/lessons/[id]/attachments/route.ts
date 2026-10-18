import { ok, route } from '@/server/errors/route';
import { listAttachments } from '@/server/modules/attachments/attachments.service';
import { requireUser } from '@/server/security/session';

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  return ok(await listAttachments(user, (await params).id));
});

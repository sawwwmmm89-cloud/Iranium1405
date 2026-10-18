import { ok } from '@/server/errors/route';
import { deleteAttachment } from '@/server/modules/attachments/attachments.service';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const DELETE = adminRoute<{ params: Promise<{ id: string }> }>(
  { roles: ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'] },
  async (req, { params }, user) => ok(await deleteAttachment(user, (await params).id, clientIp(req))),
);

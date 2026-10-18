import { ok } from '@/server/errors/route';
import { purgeDeletedAttachments } from '@/server/modules/attachments/attachments.service';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const POST = adminRoute({ roles: ['SUPER_ADMIN'] }, async (req, _ctx, user) =>
  ok(await purgeDeletedAttachments(user.id, clientIp(req))),
);

import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { changeUserRole } from '@/server/modules/admin-users/admin-users.service';
import { changeRoleSchema } from '@/server/modules/admin-users/user.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const PATCH = adminRoute<{ params: Promise<{ id: string }> }>(
  { roles: ['SUPER_ADMIN'] },
  async (req, { params }, user) => {
    const { role } = await readBody(req, changeRoleSchema);
    return ok(await changeUserRole((await params).id, role, { id: user.id, role: user.role, ip: clientIp(req) }));
  },
);

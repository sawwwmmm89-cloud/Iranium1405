import { ok } from '@/server/errors/route';
import { setUserStatus } from '@/server/modules/admin-users/admin-users.service';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const POST = adminRoute<{ params: Promise<{ id: string }> }>(
  { roles: ['SUPER_ADMIN'] },
  async (req, { params }, user) =>
    ok(await setUserStatus((await params).id, 'SUSPENDED', { id: user.id, role: user.role, ip: clientIp(req) })),
);

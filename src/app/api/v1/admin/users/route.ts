import { ok } from '@/server/errors/route';
import { listAdminUsers } from '@/server/modules/admin-users/admin-users.service';
import { adminUserListQuerySchema } from '@/server/modules/admin-users/user.schema';
import { adminRoute } from '@/server/security/admin-route';

// ADMIN + SUPER_ADMIN may list; mutations below are SUPER_ADMIN only.
export const GET = adminRoute({}, async (req) => {
  const query = adminUserListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { items, total } = await listAdminUsers(query);
  return ok(items, 200, { page: query.page, pageSize: query.pageSize, total });
});

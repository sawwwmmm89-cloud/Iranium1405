import { ok } from '@/server/errors/route';
import { listAdminComments } from '@/server/modules/blog/blog-admin.service';
import { commentListQuerySchema } from '@/server/modules/blog/blog.schema';
import { adminRoute } from '@/server/security/admin-route';

export const GET = adminRoute({}, async (req) => {
  const q = commentListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { items, total } = await listAdminComments(q);
  return ok(items, 200, { page: q.page, pageSize: q.pageSize, total });
});

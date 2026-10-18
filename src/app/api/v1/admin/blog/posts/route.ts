import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { createPost, listAdminPosts } from '@/server/modules/blog/blog-admin.service';
import { createPostSchema, postListQuerySchema } from '@/server/modules/blog/blog.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

export const GET = adminRoute({}, async (req) => {
  const q = postListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { items, total } = await listAdminPosts(q);
  return ok(items, 200, { page: q.page, pageSize: q.pageSize, total });
});

export const POST = adminRoute({}, async (req, _ctx, user) =>
  ok(await createPost(await readBody(req, createPostSchema), { actorId: user.id, ip: clientIp(req) }), 201),
);

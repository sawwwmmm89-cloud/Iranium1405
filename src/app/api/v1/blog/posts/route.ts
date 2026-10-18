import { ok, route } from '@/server/errors/route';
import { listPublishedPosts } from '@/server/modules/blog/blog-public.service';
import { postListQuerySchema } from '@/server/modules/blog/blog.schema';

export const GET = route(async (req) => {
  const q = postListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { items, total } = await listPublishedPosts(q.page, q.pageSize);
  return ok(items, 200, { page: q.page, pageSize: q.pageSize, total });
});

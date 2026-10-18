import { ok } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { deletePost, getAdminPost, updatePost } from '@/server/modules/blog/blog-admin.service';
import { updatePostSchema } from '@/server/modules/blog/blog.schema';
import { adminRoute, clientIp } from '@/server/security/admin-route';

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminRoute<Ctx>({}, async (_req, { params }) => ok(await getAdminPost((await params).id)));
export const PATCH = adminRoute<Ctx>({}, async (req, { params }, user) =>
  ok(await updatePost((await params).id, await readBody(req, updatePostSchema), { actorId: user.id, ip: clientIp(req) })),
);
export const DELETE = adminRoute<Ctx>({}, async (req, { params }, user) => ok(await deletePost((await params).id, { actorId: user.id, ip: clientIp(req) })));

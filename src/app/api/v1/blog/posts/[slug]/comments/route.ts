import { ok, route } from '@/server/errors/route';
import { readBody } from '@/server/http/body';
import { addComment } from '@/server/modules/blog/blog-public.service';
import { commentSchema } from '@/server/modules/blog/blog.schema';
import { requireUser } from '@/server/security/session';

/** Comments always start as PENDING; they appear publicly only after an admin approves them. */
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { body } = await readBody(req, commentSchema);
  return ok(await addComment(user, decodeURIComponent((await params).slug), body), 201);
});

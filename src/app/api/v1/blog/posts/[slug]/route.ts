import { ok, route } from '@/server/errors/route';
import { getPublishedPost } from '@/server/modules/blog/blog-public.service';

export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => ok(await getPublishedPost(decodeURIComponent((await params).slug))));

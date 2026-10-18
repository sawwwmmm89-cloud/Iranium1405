import { ok, route } from '@/server/errors/route';
import { enrollLive } from '@/server/modules/live/live.service';
import { requireUser } from '@/server/security/session';

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => ok(await enrollLive(await requireUser(), (await params).id)));

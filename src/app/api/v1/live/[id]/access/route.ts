import { ok, route } from '@/server/errors/route';
import { getLiveAccess } from '@/server/modules/live/live.service';
import { requireUser } from '@/server/security/session';

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => ok(await getLiveAccess(await requireUser(), (await params).id)));

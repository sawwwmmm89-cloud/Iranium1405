import { prisma } from '@/server/db/prisma';
import { ok, route } from '@/server/errors/route';

export const GET = route(async () =>
  ok(await prisma.liveClass.findMany({
    where: { deletedAt: null, status: { in: ['SCHEDULED', 'LIVE'] } },
    orderBy: { startsAt: 'asc' },
    select: { id: true, title: true, description: true, thumbnail: true, startsAt: true, durationMin: true, capacity: true, price: true, status: true, instructor: { select: { name: true } } },
  })),
);

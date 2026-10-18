import { NextResponse } from 'next/server';
import { assertRateLimit } from '@/lib/rate-limit';
import { route } from '@/server/errors/route';
import { createDownloadUrl } from '@/server/modules/attachments/attachments.service';
import { requireUser } from '@/server/security/session';

/** Authorizes on the server and redirects (302) to a short-lived signed URL; nothing is publicly addressable. */
export const GET = route<{ params: Promise<{ id: string; attachmentId: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  assertRateLimit(`download:${user.id}`, 60, 60_000);
  const { id, attachmentId } = await params;
  const url = await createDownloadUrl(user, id, attachmentId);
  const res = NextResponse.redirect(url, 302);
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
});

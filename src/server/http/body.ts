import 'server-only';
import type { NextRequest } from 'next/server';
import type { z } from 'zod';
import { AppError } from '@/server/errors/app-error';

/** Parses the JSON body and validates it with Zod (ZodError -> 422 via route()). */
export async function readBody<T>(req: NextRequest, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError(400, 'BAD_JSON', 'بدنهٔ درخواست باید JSON معتبر باشد.');
  }
  return schema.parse(raw);
}

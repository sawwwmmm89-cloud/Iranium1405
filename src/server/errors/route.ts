import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { logger } from '@/lib/logger';
import { AppError } from './app-error';

type Handler<C> = (req: NextRequest, ctx: C) => Promise<NextResponse>;

export const ok = <T>(data: T, status = 200, meta?: Record<string, unknown>) =>
  NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });

const fail = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json({ success: false, error: { code, message, details } }, { status });

export const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Central error handling + same-origin check for state-changing requests. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (MUTATING.has(req.method)) {
        const origin = req.headers.get('origin');
        if (origin) {
          const configuredOrigins = [
            process.env.NEXT_PUBLIC_APP_URL,
            process.env.VERCEL_URL,
            process.env.V0_RUNTIME_URL,
            process.env.V0_DEV_APP_URL,
            process.env.V0_BUILD_URL,
            process.env.V0_SANDBOX_URL,
          ]
            .filter((value): value is string => Boolean(value))
            .flatMap((value) => {
              try {
                return [new URL(value.includes('://') ? value : `https://${value}`).origin];
              } catch {
                return [];
              }
            });
          const allowedOrigins = new Set([req.nextUrl.origin, ...configuredOrigins]);
          let originAllowed = allowedOrigins.has(origin);
          if (!originAllowed && process.env.NODE_ENV !== 'production') {
            try {
              originAllowed = new URL(origin).hostname === 'localhost';
            } catch {
              originAllowed = false;
            }
          }
          if (!originAllowed) {
            throw new AppError(403, 'BAD_ORIGIN', 'درخواست نامعتبر است.');
          }
        }
      }
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) return fail(err.status, err.code, err.message, err.details);
      if (err instanceof ZodError) {
        return fail(422, 'VALIDATION_ERROR', 'اطلاعات واردشده معتبر نیست.', err.flatten().fieldErrors);
      }
      const requestId = randomUUID();
      logger.error('unhandled_route_error', { requestId, method: req.method, path: req.nextUrl.pathname, error: err });
      return fail(500, 'INTERNAL_ERROR', `خطای داخلی سرور. کد پیگیری: ${requestId}`);
    }
  };
}

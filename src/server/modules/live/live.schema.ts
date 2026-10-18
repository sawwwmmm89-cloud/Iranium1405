import { z } from 'zod';
import { LIMITS, safeUrl } from '@/server/modules/admin-courses/course.schema';

const INT4 = 2_147_483_647;
const fields = {
  title: z.string().trim().min(2).max(LIMITS.title),
  description: z.string().trim().min(1).max(LIMITS.description),
  instructorId: z.string().uuid(),
  thumbnail: safeUrl.nullable(),
  startsAt: z.coerce.date(),
  durationMin: z.number().int().min(1).max(INT4),
  capacity: z.number().int().min(1).max(INT4).nullable(),
  price: z.number().int().min(0).max(INT4),
  providerRef: z.string().trim().min(1).max(LIMITS.videoRef).nullable(),
};

export const createLiveSchema = z
  .object({
    title: fields.title, description: fields.description, instructorId: fields.instructorId,
    thumbnail: fields.thumbnail.optional(), startsAt: fields.startsAt, durationMin: fields.durationMin,
    capacity: fields.capacity.optional(), price: fields.price.default(0), providerRef: fields.providerRef.optional(),
  })
  .strict();

export const updateLiveSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'حداقل یک فیلد برای ویرایش لازم است.' });

export const liveStatusSchema = z.object({ status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']) }).strict();

export type CreateLiveInput = z.infer<typeof createLiveSchema>;
export type UpdateLiveInput = z.infer<typeof updateLiveSchema>;

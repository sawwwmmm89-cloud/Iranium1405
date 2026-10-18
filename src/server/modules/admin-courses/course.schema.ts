import { z } from 'zod';
import { AppError } from '@/server/errors/app-error';

/** PostgreSQL INT4 upper bound: every Int column in schema.prisma is bounded by this. */
export const INT4_MAX = 2_147_483_647;

/**
 * Neither schema.prisma nor docs/ define string lengths, so these are the only
 * limits introduced here (single place, adjust if UI needs differ).
 */
export const LIMITS = {
  title: 200,
  shortDesc: 500,
  description: 50_000,
  url: 2048,
  seoTitle: 200,
  seoDescription: 400,
  sectionTitle: 200,
  lessonTitle: 200,
  lessonDescription: 5000,
  videoProvider: 50,
  videoRef: 200,
  search: 100,
} as const;

const SAFE_URL = /^(https?:\/\/[^\s]+|\/(?![/\\])[^\s]*)$/i;
export const safeUrl = z.string().trim().max(LIMITS.url).regex(SAFE_URL, 'آدرس باید http(s) یا مسیر نسبی معتبر باشد.');
const money = z.number().int().min(0).max(INT4_MAX);
const nonNegInt = z.number().int().min(0).max(INT4_MAX);
const uuid = z.string().uuid();

export const parseId = (value: string): string => uuid.parse(value);

export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export const COURSE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const LESSON_STATUSES = ['DRAFT', 'PUBLISHED', 'DISABLED'] as const;

const PRICING_MESSAGE = 'قیمت با تخفیف نباید از قیمت اصلی بیشتر باشد.';

export function assertPricing(price: number, discountPrice: number | null | undefined): void {
  if (discountPrice != null && discountPrice > price) {
    throw new AppError(422, 'VALIDATION_ERROR', 'اطلاعات واردشده معتبر نیست.', {
      discountPrice: [PRICING_MESSAGE],
    });
  }
}

const pricingRefine = (v: { price?: number; discountPrice?: number | null }, ctx: z.RefinementCtx) => {
  if (v.price !== undefined && v.discountPrice != null && v.discountPrice > v.price) {
    ctx.addIssue({ code: 'custom', path: ['discountPrice'], message: PRICING_MESSAGE });
  }
};

export const createCourseSchema = z
  .object({
    title: z.string().trim().min(2).max(LIMITS.title),
    shortDesc: z.string().trim().min(1).max(LIMITS.shortDesc),
    description: z.string().trim().min(1).max(LIMITS.description),
    thumbnail: safeUrl.nullable().optional(),
    cover: safeUrl.nullable().optional(),
    price: money.default(0),
    discountPrice: money.nullable().optional(),
    instructorId: uuid,
    categoryId: uuid,
    level: z.enum(COURSE_LEVELS).default('BEGINNER'),
    durationMin: nonNegInt.default(0),
    featured: z.boolean().default(false),
    seoTitle: z.string().trim().max(LIMITS.seoTitle).nullable().optional(),
    seoDescription: z.string().trim().max(LIMITS.seoDescription).nullable().optional(),
  })
  .strict() // status/slug can never be mass-assigned
  .superRefine(pricingRefine);

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(2).max(LIMITS.title),
    shortDesc: z.string().trim().min(1).max(LIMITS.shortDesc),
    description: z.string().trim().min(1).max(LIMITS.description),
    thumbnail: safeUrl.nullable(),
    cover: safeUrl.nullable(),
    price: money,
    discountPrice: money.nullable(),
    instructorId: uuid,
    categoryId: uuid,
    level: z.enum(COURSE_LEVELS),
    durationMin: nonNegInt,
    featured: z.boolean(),
    seoTitle: z.string().trim().max(LIMITS.seoTitle).nullable(),
    seoDescription: z.string().trim().max(LIMITS.seoDescription).nullable(),
  })
  .partial()
  .strict() // slug is never changed by PATCH
  .refine((v) => Object.keys(v).length > 0, { message: 'حداقل یک فیلد برای ویرایش لازم است.' })
  .superRefine(pricingRefine);

export const sectionSchema = z.object({ title: z.string().trim().min(1).max(LIMITS.sectionTitle) }).strict();

const lessonFields = {
  title: z.string().trim().min(1).max(LIMITS.lessonTitle),
  description: z.string().trim().max(LIMITS.lessonDescription).nullable(),
  videoProvider: z.string().trim().min(1).max(LIMITS.videoProvider).nullable(),
  videoRef: z.string().trim().min(1).max(LIMITS.videoRef).nullable(),
  durationSec: nonNegInt,
  isFreePreview: z.boolean(),
  attachmentUrl: safeUrl.nullable(),
  status: z.enum(LESSON_STATUSES),
};

export const createLessonSchema = z
  .object({
    title: lessonFields.title,
    description: lessonFields.description.optional(),
    videoProvider: lessonFields.videoProvider.optional(),
    videoRef: lessonFields.videoRef.optional(),
    durationSec: lessonFields.durationSec.default(0),
    isFreePreview: lessonFields.isFreePreview.default(false),
    attachmentUrl: lessonFields.attachmentUrl.optional(),
    status: lessonFields.status.default('DRAFT'),
  })
  .strict();

export const updateLessonSchema = z
  .object(lessonFields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'حداقل یک فیلد برای ویرایش لازم است.' });

export const reorderSchema = z
  .object({ ids: z.array(uuid).min(1).max(500) })
  .strict()
  .refine((v) => new Set(v.ids).size === v.ids.length, { message: 'شناسه‌ها نباید تکراری باشند.' });

const page = z.coerce.number().int().min(1).max(100_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);

export const adminCourseListQuerySchema = z.object({
  page,
  pageSize,
  q: z.string().trim().max(LIMITS.search).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type AdminCourseListQuery = z.infer<typeof adminCourseListQuerySchema>;

import { z } from 'zod';
import { LIMITS, safeUrl } from '@/server/modules/admin-courses/course.schema';

const fields = {
  title: z.string().trim().min(2).max(LIMITS.title),
  excerpt: z.string().trim().min(1).max(LIMITS.shortDesc),
  content: z.string().trim().min(1).max(100_000),
  coverImageUrl: safeUrl.nullable(),
  categoryName: z.string().trim().min(1).max(100).nullable(),
  seoTitle: z.string().trim().max(LIMITS.seoTitle).nullable(),
  seoDescription: z.string().trim().max(LIMITS.seoDescription).nullable(),
};

export const createPostSchema = z
  .object({
    title: fields.title, excerpt: fields.excerpt, content: fields.content,
    coverImageUrl: fields.coverImageUrl.optional(), categoryName: fields.categoryName.optional(),
    seoTitle: fields.seoTitle.optional(), seoDescription: fields.seoDescription.optional(),
  })
  .strict();

export const updatePostSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'حداقل یک فیلد برای ویرایش لازم است.' });

export const commentSchema = z.object({ body: z.string().trim().min(2).max(2000) }).strict();
export const moderateSchema = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']) }).strict();

const page = z.coerce.number().int().min(1).max(100_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(12);
export const postListQuerySchema = z.object({ page, pageSize, q: z.string().trim().max(LIMITS.search).optional(), status: z.enum(['DRAFT', 'PUBLISHED']).optional() });
export const commentListQuerySchema = z.object({ page, pageSize: pageSize.default(20), status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostListQuery = z.infer<typeof postListQuerySchema>;
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;

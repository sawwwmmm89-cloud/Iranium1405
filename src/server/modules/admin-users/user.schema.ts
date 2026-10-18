import { z } from 'zod';
import { LIMITS } from '@/server/modules/admin-courses/course.schema';

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'] as const;
export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export const changeRoleSchema = z.object({ role: z.enum(ROLES) }).strict();

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(LIMITS.search).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

import { describe, expect, it } from 'vitest';
import {
  INT4_MAX,
  assertPricing,
  createCourseSchema,
  createLessonSchema,
  reorderSchema,
  updateCourseSchema,
  updateLessonSchema,
} from '@/server/modules/admin-courses/course.schema';

const uuid = '3f6d1c0e-8a4b-4c1e-9d2a-5b7e8f9a0b1c';
const valid = {
  title: 'دورهٔ تست',
  shortDesc: 'خلاصه',
  description: 'توضیحات',
  instructorId: uuid,
  categoryId: uuid,
};

describe('createCourseSchema', () => {
  it('applies defaults', () => {
    const r = createCourseSchema.parse(valid);
    expect(r).toMatchObject({ price: 0, level: 'BEGINNER', durationMin: 0, featured: false });
  });
  it('rejects discount above price and negative numbers', () => {
    expect(createCourseSchema.safeParse({ ...valid, price: 100, discountPrice: 101 }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, price: 100, discountPrice: 100 }).success).toBe(true);
    expect(createCourseSchema.safeParse({ ...valid, price: -1 }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, durationMin: -5 }).success).toBe(false);
  });
  it('rejects values beyond INT4 and non-integers', () => {
    expect(createCourseSchema.safeParse({ ...valid, price: INT4_MAX + 1 }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, price: 10.5 }).success).toBe(false);
  });
  it('rejects mass-assignment of status/slug', () => {
    expect(createCourseSchema.safeParse({ ...valid, status: 'PUBLISHED' }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, slug: 'x' }).success).toBe(false);
  });
  it('only accepts http(s) or root-relative URLs', () => {
    expect(createCourseSchema.safeParse({ ...valid, thumbnail: 'https://cdn.example.com/a.png' }).success).toBe(true);
    expect(createCourseSchema.safeParse({ ...valid, thumbnail: '/img/a.png' }).success).toBe(true);
    for (const bad of ['javascript:alert(1)', '//evil.com/a.png', '/\\evil.com', 'data:text/html,x', 'ftp://x.com/a']) {
      expect(createCourseSchema.safeParse({ ...valid, thumbnail: bad }).success).toBe(false);
    }
  });
  it('requires uuid references', () => {
    expect(createCourseSchema.safeParse({ ...valid, instructorId: 'nope' }).success).toBe(false);
  });
});

describe('updateCourseSchema', () => {
  it('requires at least one field and forbids slug', () => {
    expect(updateCourseSchema.safeParse({}).success).toBe(false);
    expect(updateCourseSchema.safeParse({ slug: 'x' }).success).toBe(false);
    expect(updateCourseSchema.safeParse({ title: 'عنوان جدید' }).success).toBe(true);
  });
  it('checks pricing only when both values are in the patch', () => {
    expect(updateCourseSchema.safeParse({ price: 10, discountPrice: 20 }).success).toBe(false);
    expect(updateCourseSchema.safeParse({ discountPrice: 20 }).success).toBe(true); // merged check happens in the service
  });
});

describe('assertPricing', () => {
  it('throws a 422 with field details', () => {
    expect(() => assertPricing(10, 11)).toThrowError(expect.objectContaining({ status: 422, code: 'VALIDATION_ERROR' }));
    expect(() => assertPricing(10, null)).not.toThrow();
    expect(() => assertPricing(10, 10)).not.toThrow();
  });
});

describe('lesson / reorder schemas', () => {
  it('defaults lesson to DRAFT and rejects negative duration', () => {
    expect(createLessonSchema.parse({ title: 'جلسه' })).toMatchObject({ status: 'DRAFT', durationSec: 0, isFreePreview: false });
    expect(createLessonSchema.safeParse({ title: 'جلسه', durationSec: -1 }).success).toBe(false);
    expect(updateLessonSchema.safeParse({}).success).toBe(false);
    expect(updateLessonSchema.safeParse({ status: 'ARCHIVED' }).success).toBe(false);
  });
  it('reorder needs unique uuids', () => {
    expect(reorderSchema.safeParse({ ids: [uuid, uuid] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: [uuid] }).success).toBe(true);
  });
});

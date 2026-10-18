import { describe, expect, it } from 'vitest';
import { MAX_SLUG_LENGTH, generateUniqueSlug, slugify } from '@/server/modules/admin-courses/slug';

describe('slugify', () => {
  it('keeps Persian letters and digits, turns spaces into one dash', () => {
    expect(slugify('آموزش  برنامه‌نویسی ۱۰۱')).toBe('آموزش-برنامه-نویسی-۱۰۱');
  });
  it('lowercases Latin and collapses separators', () => {
    expect(slugify('  React -- Basics!!  ')).toBe('react-basics');
  });
  it('normalizes Arabic yeh/kaf to Persian', () => {
    expect(slugify('دورة كامل')).toBe('دورة-کامل');
    expect(slugify('علي')).toBe('علی');
  });
  it('returns empty string when nothing usable remains', () => {
    expect(slugify('!!! ---')).toBe('');
  });
  it('is capped at MAX_SLUG_LENGTH without trailing dash', () => {
    const s = slugify(`${'الف '.repeat(200)}`);
    expect(Array.from(s).length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('generateUniqueSlug', () => {
  const takenSet = (...taken: string[]) => async (s: string) => taken.includes(s);
  it('uses the base slug when free', async () => {
    expect(await generateUniqueSlug('دوره جدید', takenSet())).toBe('دوره-جدید');
  });
  it('appends -2, -3 on collisions', async () => {
    expect(await generateUniqueSlug('Intro', takenSet('intro'))).toBe('intro-2');
    expect(await generateUniqueSlug('Intro', takenSet('intro', 'intro-2'))).toBe('intro-3');
  });
  it('falls back to "course" for empty titles and still deduplicates', async () => {
    expect(await generateUniqueSlug('???', takenSet())).toBe('course');
    expect(await generateUniqueSlug('???', takenSet('course'))).toBe('course-2');
  });
  it('keeps suffixed slugs within the length limit', async () => {
    const long = 'الف'.repeat(300);
    const base = slugify(long);
    const slug = await generateUniqueSlug(long, takenSet(base));
    expect(Array.from(slug).length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith('-2')).toBe(true);
  });
});

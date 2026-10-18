export const MAX_SLUG_LENGTH = 120;
const FALLBACK = 'course';

/**
 * Unicode-preserving slug: Persian letters/digits stay; Latin is lowercased;
 * whitespace, ZWNJ and punctuation collapse into single "-".
 */
export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return trimTo(normalized, MAX_SLUG_LENGTH);
}

function trimTo(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length <= max ? value : chars.slice(0, max).join('').replace(/-+$/g, '');
}

/** Returns `base`, else `base-2`, `base-3`, ... Empty bases fall back to "course". */
export async function generateUniqueSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title) || FALLBACK;
  if (!(await isTaken(base))) return base;
  for (let n = 2; n < 10_000; n++) {
    const suffix = `-${n}`;
    const candidate = `${trimTo(base, MAX_SLUG_LENGTH - suffix.length)}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('Could not generate a unique slug');
}

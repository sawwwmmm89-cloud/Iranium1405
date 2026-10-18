import 'server-only';
import type { LiveProvider } from './types';

/**
 * No live-streaming vendor is integrated: no vendor documentation or credentials were available, so no vendor
 * API is guessed. Implement LiveProvider against the vendor's official docs and return it here.
 */
export function getLiveProvider(): LiveProvider | null {
  return null;
}

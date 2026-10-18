import { vi } from 'vitest';

// `server-only` throws outside the Next.js bundler; neutralize it for unit tests.
vi.mock('server-only', () => ({}));

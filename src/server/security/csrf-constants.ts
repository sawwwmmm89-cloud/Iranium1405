// Edge-safe (no Node imports): used by middleware and by server code.
export const CSRF_COOKIE = 'bama_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const TOKEN_BYTES = 32;

export function createCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Not HttpOnly on purpose: the admin client must read it and echo it in X-CSRF-Token. */
export const csrfCookieOptions = (production: boolean) =>
  ({
    httpOnly: false,
    secure: production,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }) as const;

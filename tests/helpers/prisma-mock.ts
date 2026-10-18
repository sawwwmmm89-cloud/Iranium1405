import { vi, type Mock } from 'vitest';

/** Auto-mocking Prisma stand-in: any `prisma.<model>.<method>` is a vi.fn created on demand. */
export function createPrismaMock() {
  const fns = new Map<string, Mock>();
  const models = new Map<string, object>();
  const fn = (path: string): Mock => {
    let f = fns.get(path);
    if (!f) {
      f = vi.fn();
      fns.set(path, f);
    }
    return f;
  };
  const client: object = new Proxy(
    {},
    {
      get(_target, prop) {
        const name = String(prop);
        if (name === 'then') return undefined; // never look like a thenable
        if (name === '$transaction') return (cb: (tx: unknown) => unknown) => cb(client);
        if (name.startsWith('$')) return fn(name);
        let model = models.get(name);
        if (!model) {
          model = new Proxy({}, { get: (_m, method) => (String(method) === 'then' ? undefined : fn(`${name}.${String(method)}`)) });
          models.set(name, model);
        }
        return model;
      },
    },
  );
  return { client, fn, reset: () => fns.forEach((f) => f.mockReset()) };
}

export const pm = createPrismaMock();

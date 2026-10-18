import 'server-only';
import argon2 from 'argon2';

const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTIONS);

let dummyHash: Promise<string> | undefined;

export async function verifyPassword(hash: string | null, plain: string): Promise<boolean> {
  // Unknown user: verify against a dummy hash so timing does not reveal account existence.
  const target = hash ?? (await (dummyHash ??= hashPassword('bama-dummy-password')));
  const valid = await argon2.verify(target, plain).catch(() => false);
  return hash !== null && valid;
}

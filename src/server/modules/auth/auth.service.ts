import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { errors } from '@/server/errors/app-error';
import { recordAudit } from '@/server/security/audit';
import { hashPassword, verifyPassword } from '@/server/security/password';
import type { LoginInput, RegisterInput } from './auth.schema';

const publicUser = { id: true, email: true, name: true, role: true } as const;

export async function registerUser(input: RegisterInput) {
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
      },
      select: publicUser,
    });
    await recordAudit({ actorId: user.id, action: 'auth.register', entity: 'User', entityId: user.id });
    return user;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw errors.conflict('این ایمیل قبلاً ثبت شده است.');
    }
    throw error;
  }
}

export async function authenticate(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await verifyPassword(user?.passwordHash ?? null, input.password);
  if (!user || !valid || user.deletedAt || user.status !== 'ACTIVE') {
    await recordAudit({ action: 'auth.login_failed', entity: 'User', entityId: user?.id ?? null });
    throw errors.invalidCredentials();
  }
  await recordAudit({ actorId: user.id, action: 'auth.login', entity: 'User', entityId: user.id });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

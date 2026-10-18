import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', async () => ({ prisma: (await import('../helpers/prisma-mock')).pm.client }));

import { changeUserRole, setUserStatus, type UserActor } from '@/server/modules/admin-users/admin-users.service';
import { pm } from '../helpers/prisma-mock';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';
const superAdmin: UserActor = { id: ACTOR, role: 'SUPER_ADMIN', ip: '10.0.0.1' };

const auditData = () => pm.fn('auditLog.create').mock.calls[0]?.[0]?.data;

beforeEach(() => {
  pm.reset();
  pm.fn('user.update').mockResolvedValue({});
  pm.fn('auditLog.create').mockResolvedValue({});
  pm.fn('$queryRaw').mockResolvedValue([]);
});

describe('changeUserRole', () => {
  it('forbids non-SUPER_ADMIN actors before touching the database', async () => {
    await expect(changeUserRole(TARGET, 'ADMIN', { id: ACTOR, role: 'ADMIN' })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(pm.fn('user.findFirst')).not.toHaveBeenCalled();
  });
  it('forbids changing your own role', async () => {
    await expect(changeUserRole(ACTOR, 'STUDENT', superAdmin)).rejects.toMatchObject({ status: 403, code: 'SELF_MODIFICATION_FORBIDDEN' });
  });
  it('rejects malformed ids', async () => {
    await expect(changeUserRole('nope', 'ADMIN', superAdmin)).rejects.toThrow();
  });
  it('404 when target is missing or deleted', async () => {
    pm.fn('user.findFirst').mockResolvedValue(null);
    await expect(changeUserRole(TARGET, 'ADMIN', superAdmin)).rejects.toMatchObject({ status: 404 });
    expect(pm.fn('user.findFirst').mock.calls[0]?.[0].where).toMatchObject({ id: TARGET, deletedAt: null });
  });
  it('changes the role and writes user.role_change audit with from/to', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'STUDENT', status: 'ACTIVE' });
    await expect(changeUserRole(TARGET, 'ADMIN', superAdmin)).resolves.toMatchObject({ role: 'ADMIN', changed: true });
    expect(pm.fn('user.update')).toHaveBeenCalledWith({ where: { id: TARGET }, data: { role: 'ADMIN' } });
    expect(auditData()).toMatchObject({
      actorId: ACTOR, action: 'user.role_change', entity: 'User', entityId: TARGET,
      metadata: { from: 'STUDENT', to: 'ADMIN' },
    });
  });
  it('is a no-op (no update, no audit) when the role is unchanged', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'ADMIN', status: 'ACTIVE' });
    await expect(changeUserRole(TARGET, 'ADMIN', superAdmin)).resolves.toMatchObject({ changed: false });
    expect(pm.fn('user.update')).not.toHaveBeenCalled();
    expect(pm.fn('auditLog.create')).not.toHaveBeenCalled();
  });
  it('refuses to demote the last active SUPER_ADMIN', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    pm.fn('user.count').mockResolvedValue(1);
    await expect(changeUserRole(TARGET, 'ADMIN', superAdmin)).rejects.toMatchObject({ status: 409, code: 'LAST_SUPER_ADMIN' });
    expect(pm.fn('user.update')).not.toHaveBeenCalled();
    expect(pm.fn('$queryRaw')).toHaveBeenCalled(); // rows were locked first
  });
  it('allows demoting a SUPER_ADMIN when another active one exists', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    pm.fn('user.count').mockResolvedValue(2);
    await expect(changeUserRole(TARGET, 'ADMIN', superAdmin)).resolves.toMatchObject({ changed: true });
  });
});

describe('setUserStatus', () => {
  it('only SUPER_ADMIN may suspend/activate', async () => {
    await expect(setUserStatus(TARGET, 'SUSPENDED', { id: ACTOR, role: 'ADMIN' })).rejects.toMatchObject({ status: 403 });
  });
  it('cannot suspend yourself', async () => {
    await expect(setUserStatus(ACTOR, 'SUSPENDED', superAdmin)).rejects.toMatchObject({ code: 'SELF_MODIFICATION_FORBIDDEN' });
  });
  it('suspend revokes all active sessions and audits user.suspend', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'STUDENT', status: 'ACTIVE' });
    pm.fn('session.updateMany').mockResolvedValue({ count: 3 });
    await expect(setUserStatus(TARGET, 'SUSPENDED', superAdmin)).resolves.toMatchObject({ status: 'SUSPENDED', changed: true });
    const arg = pm.fn('session.updateMany').mock.calls[0]?.[0];
    expect(arg.where).toEqual({ userId: TARGET, revokedAt: null });
    expect(arg.data.revokedAt).toBeInstanceOf(Date);
    expect(auditData()).toMatchObject({ action: 'user.suspend', entityId: TARGET, metadata: { revokedSessions: 3 } });
  });
  it('activate does not touch sessions and audits user.activate', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'STUDENT', status: 'SUSPENDED' });
    await setUserStatus(TARGET, 'ACTIVE', superAdmin);
    expect(pm.fn('session.updateMany')).not.toHaveBeenCalled();
    expect(auditData()).toMatchObject({ action: 'user.activate' });
  });
  it('no-op when status is already the requested one', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'STUDENT', status: 'SUSPENDED' });
    await expect(setUserStatus(TARGET, 'SUSPENDED', superAdmin)).resolves.toMatchObject({ changed: false });
    expect(pm.fn('auditLog.create')).not.toHaveBeenCalled();
  });
  it('refuses to suspend the last active SUPER_ADMIN', async () => {
    pm.fn('user.findFirst').mockResolvedValue({ id: TARGET, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    pm.fn('user.count').mockResolvedValue(1);
    await expect(setUserStatus(TARGET, 'SUSPENDED', superAdmin)).rejects.toMatchObject({ status: 409, code: 'LAST_SUPER_ADMIN' });
    expect(pm.fn('session.updateMany')).not.toHaveBeenCalled();
  });
});

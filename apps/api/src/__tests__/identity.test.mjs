import test from 'node:test';
import assert from 'node:assert/strict';
import { accountStatuses, roles } from '../../../../packages/shared/src/index.mjs';
import { assertActiveAccount } from '../common/guards/account-status-guard.mjs';
import { assertRole } from '../common/guards/role-guard.mjs';
import { InMemoryUserRepository } from '../modules/accounts/in-memory-user-repository.mjs';
import { AccountService } from '../modules/accounts/account-service.mjs';
import { AppError } from '../common/errors/app-error.mjs';
import { assertPublicRegistrationRole } from '../modules/identity/profile-sync-policy.mjs';

test('public profile sync allows client accounts', () => {
  assert.doesNotThrow(() => assertPublicRegistrationRole(roles.client));
});

test('public profile sync rejects admin self-registration', () => {
  assert.throws(() => assertPublicRegistrationRole(roles.admin), AppError);
});

test('account status guard blocks suspended users', () => {
  assert.throws(
    () =>
      assertActiveAccount({
        id: 'usr_1',
        role: roles.client,
        accountStatus: accountStatuses.suspended
      }),
    AppError
  );
});

test('role guard blocks truck owner from admin route', () => {
  assert.throws(
    () =>
      assertRole(
        {
          id: 'usr_1',
          role: roles.truckOwner,
          accountStatus: accountStatuses.active
        },
        [roles.admin]
      ),
    AppError
  );
});

test('account service syncs and updates a public profile', () => {
  const service = new AccountService({
    userRepository: new InMemoryUserRepository()
  });

  const first = service.syncProfile({
    authUser: { sub: 'client-auth-001' },
    role: roles.client,
    fullName: 'Client Demo',
    email: 'client@example.com',
    phone: '+251911111111'
  });

  assert.equal(first.created, true);
  assert.equal(first.user.role, roles.client);

  const second = service.syncProfile({
    authUser: { sub: 'client-auth-001' },
    role: roles.admin,
    fullName: 'Client Demo Updated',
    email: 'client-updated@example.com',
    phone: '+251922222222'
  });

  assert.equal(second.created, false);
  assert.equal(second.user.role, roles.client);
  assert.equal(second.user.fullName, 'Client Demo Updated');
  assert.equal(second.user.email, 'client-updated@example.com');
});

test('staff accounts are provisioned by admin flow, not public self-registration', () => {
  const service = new AccountService({
    userRepository: new InMemoryUserRepository()
  });

  const admin = service.provisionStaffUser({
    actor: {
      id: 'usr_system',
      role: roles.admin,
      accountStatus: accountStatuses.active
    },
    supabaseUserId: 'admin-seed-001',
    role: roles.admin,
    fullName: 'Admin Seed',
    email: 'admin@kuli.local',
    phone: undefined
  });

  const assistant = service.provisionStaffUser({
    actor: admin,
    supabaseUserId: 'assistant-001',
    role: roles.assistant,
    fullName: 'Assistant Demo',
    email: 'assistant@kuli.local',
    phone: '+251933333333'
  });

  assert.equal(assistant.role, roles.assistant);
  assert.throws(() => assertPublicRegistrationRole(roles.assistant), AppError);
});

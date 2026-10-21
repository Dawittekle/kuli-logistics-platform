import test from 'node:test';
import assert from 'node:assert/strict';
import { roles, accountStatuses, blockedAccountStatuses } from '../../packages/shared/src/index.mjs';
import { assertRole } from '../../apps/api/src/common/guards/role-guard.mjs';
import { assertActiveAccount } from '../../apps/api/src/common/guards/account-status-guard.mjs';
import { assertPublicRegistrationRole } from '../../apps/api/src/modules/identity/profile-sync-policy.mjs';
import { AppError } from '../../apps/api/src/common/errors/app-error.mjs';

test('public registration strictly allows only client and truck_owner roles', () => {
  assert.doesNotThrow(() => assertPublicRegistrationRole(roles.client));
  assert.doesNotThrow(() => assertPublicRegistrationRole(roles.truckOwner));

  assert.throws(
    () => assertPublicRegistrationRole(roles.admin),
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.code, 'PUBLIC_REGISTRATION_NOT_ALLOWED');
      return true;
    }
  );

  assert.throws(
    () => assertPublicRegistrationRole(roles.assistant),
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.code, 'PUBLIC_REGISTRATION_NOT_ALLOWED');
      return true;
    }
  );
});

test('role guard blocks customer from accessing driver operations', () => {
  const clientUser = {
    id: 'usr_client_01',
    role: roles.client,
    accountStatus: accountStatuses.active
  };

  assert.throws(
    () => assertRole(clientUser, [roles.truckOwner]),
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.code, 'FORBIDDEN');
      return true;
    }
  );
});

test('role guard blocks driver from accessing administrative control panel', () => {
  const driverUser = {
    id: 'usr_driver_01',
    role: roles.truckOwner,
    accountStatus: accountStatuses.active
  };

  assert.throws(
    () => assertRole(driverUser, [roles.admin]),
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.code, 'FORBIDDEN');
      return true;
    }
  );
});

test('account status guard blocks suspended, banned, and deleted accounts from protected endpoints', () => {
  for (const blockedStatus of blockedAccountStatuses) {
    const user = {
      id: `usr_${blockedStatus}`,
      role: roles.client,
      accountStatus: blockedStatus
    };

    assert.throws(
      () => assertActiveAccount(user),
      (err) => {
        assert.equal(err instanceof AppError, true);
        assert.equal(err.code, 'ACCOUNT_BLOCKED');
        return true;
      }
    );
  }
});

test('active accounts pass account status guard successfully', () => {
  const activeUser = {
    id: 'usr_active_01',
    role: roles.client,
    accountStatus: accountStatuses.active
  };

  assert.doesNotThrow(() => assertActiveAccount(activeUser));
});

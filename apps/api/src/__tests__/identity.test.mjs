import test from 'node:test';
import assert from 'node:assert/strict';
import { accountStatuses, roles } from '../../../../packages/shared/src/index.mjs';
import { assertActiveAccount } from '../common/guards/account-status-guard.mjs';
import { assertRole } from '../common/guards/role-guard.mjs';
import { InMemoryUserRepository } from '../modules/accounts/in-memory-user-repository.mjs';
import { AccountService } from '../modules/accounts/account-service.mjs';
import { AppError } from '../common/errors/app-error.mjs';
import { assertPublicRegistrationRole } from '../modules/identity/profile-sync-policy.mjs';
import { SupabaseTokenVerifier } from '../integrations/supabase/token-verifier.mjs';

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

test('account service syncs and updates a public profile', async () => {
  const service = new AccountService({
    userRepository: new InMemoryUserRepository()
  });

  const first = await service.syncProfile({
    authUser: { sub: 'client-auth-001' },
    role: roles.client,
    fullName: 'Client Demo',
    email: 'client@example.com',
    phone: '+251911111111'
  });

  assert.equal(first.created, true);
  assert.equal(first.user.role, roles.client);

  const second = await service.syncProfile({
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

test('account service relinks stale profiles by verified Supabase email', async () => {
  const service = new AccountService({
    userRepository: new InMemoryUserRepository()
  });

  await service.syncProfile({
    authUser: { sub: 'old-supabase-id', email: 'client4@gmail.com' },
    role: roles.client,
    fullName: 'Client Four',
    email: 'client4@gmail.com',
    phone: '+251911111111'
  });

  const current = await service.getCurrentUser({
    sub: 'new-supabase-id',
    email: 'CLIENT4@gmail.com'
  });

  assert.equal(current.role, roles.client);
  assert.equal(current.supabaseUserId, 'new-supabase-id');
  assert.equal(current.email, 'client4@gmail.com');
});

test('staff accounts are provisioned by admin flow, not public self-registration', async () => {
  const service = new AccountService({
    userRepository: new InMemoryUserRepository()
  });

  const admin = await service.provisionStaffUser({
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

  const assistant = await service.provisionStaffUser({
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

test('demo profile upsert reuses email and does not require phone', async () => {
  const service = new AccountService({
    userRepository: new InMemoryUserRepository()
  });

  const first = await service.upsertDemoProfile({
    supabaseUserId: 'demo-client-client1-gmail-com',
    role: roles.client,
    fullName: 'Demo Client',
    email: 'CLIENT1@GMAIL.COM',
    phone: ''
  });

  const second = await service.upsertDemoProfile({
    supabaseUserId: 'demo-owner-client1-gmail-com',
    role: roles.truckOwner,
    fullName: 'Demo Owner',
    email: 'client1@gmail.com',
    phone: ''
  });

  assert.equal(second.id, first.id);
  assert.equal(second.supabaseUserId, 'demo-owner-client1-gmail-com');
  assert.equal(second.role, roles.truckOwner);
  assert.equal(second.email, 'client1@gmail.com');
  assert.equal(second.phone, undefined);
});

test('demo login preserves an existing email role', async () => {
  const service = new AccountService({
    userRepository: new InMemoryUserRepository()
  });

  const owner = await service.upsertDemoProfile({
    supabaseUserId: 'demo-truck_owner-owner2-gmail-com',
    role: roles.truckOwner,
    fullName: 'Owner Two',
    email: 'owner2@gmail.com'
  });

  const login = await service.upsertDemoProfile({
    supabaseUserId: 'demo-client-owner2-gmail-com',
    role: roles.client,
    email: 'owner2@gmail.com',
    preserveExistingRole: true
  });

  assert.equal(login.id, owner.id);
  assert.equal(login.role, roles.truckOwner);
  assert.equal(login.supabaseUserId, 'demo-truck_owner-owner2-gmail-com');
  assert.equal(login.fullName, 'Owner Two');
});

test('development token verifier resolves dev bearer tokens', async () => {
  const verifier = new SupabaseTokenVerifier({
    mode: 'development_stub'
  });

  const authUser = await verifier.verifyAuthorizationHeader('Bearer dev:client-auth-001');

  assert.equal(authUser.sub, 'client-auth-001');
});

test('supabase verifier can allow local demo dev tokens when explicitly enabled', async () => {
  const verifier = new SupabaseTokenVerifier({
    mode: 'supabase',
    allowDevelopmentTokens: true
  });

  const authUser = await verifier.verifyAuthorizationHeader('Bearer dev:demo-owner-001');

  assert.equal(authUser.sub, 'demo-owner-001');
});

test('supabase verifier fails closed when project verification config is missing', async () => {
  const verifier = new SupabaseTokenVerifier({
    mode: 'supabase',
    issuer: '',
    jwksUrl: '',
    supabaseUrl: '',
    publishableKey: ''
  });

  const hs256UserJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoLXVzZXItMDAxIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjk5OTk5OTk5OTl9.signature';

  await assert.rejects(
    () => verifier.verifyAuthorizationHeader(`Bearer ${hs256UserJwt}`),
    (error) => error instanceof AppError && error.code === 'SUPABASE_CONFIG_MISSING'
  );
});

test('supabase verifier validates shared-secret projects through auth server', async () => {
  const verifier = new SupabaseTokenVerifier({
    mode: 'supabase',
    issuer: 'https://example.supabase.co/auth/v1',
    jwksUrl: 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
    supabaseUrl: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test_key',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.supabase.co/auth/v1/user');
      assert.equal(options.headers.apikey, 'sb_publishable_test_key');

      return {
        ok: true,
        async json() {
          return {
            id: 'auth-user-001',
            email: 'auth-user@example.com',
            phone: '+251911111111',
            app_metadata: {}
          };
        }
      };
    }
  });

  const hs256UserJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoLXVzZXItMDAxIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjk5OTk5OTk5OTl9.signature';

  const authUser = await verifier.verifyAuthorizationHeader(`Bearer ${hs256UserJwt}`);

  assert.equal(authUser.sub, 'auth-user-001');
});

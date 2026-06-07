import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decidePostSignUpAction,
  registrationSessionActions,
  shouldSuppressRegistrationSessionEvent
} from '../apps/mobile/src/auth-flow.mjs';

test('registration requires verification when Supabase does not return a session', () => {
  assert.equal(
    decidePostSignUpAction({ hasSession: false, requireEmailConfirmation: true }),
    registrationSessionActions.requireVerification
  );
});

test('registration keeps users in verification when Supabase returns an immediate session', () => {
  assert.equal(
    decidePostSignUpAction({ hasSession: true, requireEmailConfirmation: true }),
    registrationSessionActions.requireVerification
  );
});

test('registration only completes immediately behind an explicit confirmation-disabled gate', () => {
  assert.equal(
    decidePostSignUpAction({ hasSession: true, requireEmailConfirmation: false }),
    registrationSessionActions.completeAuthenticatedSignup
  );
});

test('pending registration suppresses automatic signed-in routing until verification is allowed', () => {
  assert.equal(
    shouldSuppressRegistrationSessionEvent({
      event: 'SIGNED_IN',
      sessionEmail: 'NEW.USER@example.com',
      pendingVerificationEmail: 'new.user@example.com'
    }),
    true
  );

  assert.equal(
    shouldSuppressRegistrationSessionEvent({
      event: 'SIGNED_IN',
      sessionEmail: 'new.user@example.com',
      pendingVerificationEmail: 'new.user@example.com',
      verificationAllowedEmail: 'new.user@example.com'
    }),
    false
  );
});

test('unrelated auth events or accounts are not suppressed', () => {
  assert.equal(
    shouldSuppressRegistrationSessionEvent({
      event: 'TOKEN_REFRESHED',
      sessionEmail: 'new.user@example.com',
      pendingVerificationEmail: 'new.user@example.com'
    }),
    false
  );

  assert.equal(
    shouldSuppressRegistrationSessionEvent({
      event: 'SIGNED_IN',
      sessionEmail: 'confirmed@example.com',
      pendingVerificationEmail: 'new.user@example.com'
    }),
    false
  );
});

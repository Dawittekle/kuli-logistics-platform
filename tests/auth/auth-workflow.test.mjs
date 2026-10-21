import test from 'node:test';
import assert from 'node:assert/strict';
import { roles, accountStatuses } from '../../packages/shared/src/index.mjs';
import { AccountService } from '../../apps/api/src/modules/accounts/account-service.mjs';
import { InMemoryUserRepository } from '../../apps/api/src/modules/accounts/in-memory-user-repository.mjs';
import { AppError } from '../../apps/api/src/common/errors/app-error.mjs';

// Password strength evaluator (mirrors PasswordRequirements.tsx)
function evaluatePassword(password) {
  const hasMinLength = (password ?? '').length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumberOrSymbol;

  return { hasMinLength, hasUppercase, hasLowercase, hasNumberOrSymbol, isStrong };
}

// In-memory OTP simulation manager for tests
class MockOtpAuthManager {
  constructor() {
    this.otps = new Map(); // phone -> { code, expiresAt, attempts }
    this.sessions = new Map(); // token -> user
    this.rateLimitWindows = new Map(); // phone -> lastRequestTimestamp
  }

  requestOtp(phone) {
    const now = Date.now();
    const lastRequest = this.rateLimitWindows.get(phone);

    // 60-second rate-limit cooldown
    if (lastRequest && now - lastRequest < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - lastRequest)) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds}s before requesting a new code.`);
    }

    const code = '123456';
    const expiresAt = now + 5 * 60 * 1000; // 5 min expiry
    this.otps.set(phone, { code, expiresAt, attempts: 0 });
    this.rateLimitWindows.set(phone, now);

    return { sent: true, phone, cooldownSeconds: 60 };
  }

  verifyOtp(phone, inputCode) {
    const record = this.otps.get(phone);
    if (!record) {
      throw new Error('No OTP request found for this phone number.');
    }

    if (Date.now() > record.expiresAt) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (record.attempts >= 5) {
      throw new Error('Too many failed verification attempts. Please wait 60s.');
    }

    if (record.code !== inputCode) {
      record.attempts += 1;
      throw new Error('Incorrect verification code. Please check your SMS message.');
    }

    // Success: clear OTP and return session
    this.otps.delete(phone);
    const sessionToken = `session_${Math.random().toString(36).slice(2)}`;
    return { verified: true, sessionToken, phone };
  }
}

test('successful customer signup with mandatory valid phone number', async () => {
  const userRepository = new InMemoryUserRepository();
  const accountService = new AccountService({ userRepository });

  const result = await accountService.syncProfile({
    authUser: { sub: 'auth-client-001', phone: '+251911223344' },
    role: roles.client,
    fullName: 'Abebe Bikila',
    email: 'abebe@example.com',
    phone: '+251911223344'
  });

  assert.equal(result.created, true);
  assert.equal(result.user.role, roles.client);
  assert.equal(result.user.phone, '+251911223344');
  assert.equal(result.user.fullName, 'Abebe Bikila');
  assert.equal(result.user.accountStatus, accountStatuses.active);
});

test('successful truck owner signup with phone and pending vehicle verification state', async () => {
  const userRepository = new InMemoryUserRepository();
  const accountService = new AccountService({ userRepository });

  const result = await accountService.syncProfile({
    authUser: { sub: 'auth-owner-001', phone: '+251922334455' },
    role: roles.truckOwner,
    fullName: 'Kebede Haile',
    email: 'kebede@example.com',
    phone: '+251922334455'
  });

  assert.equal(result.created, true);
  assert.equal(result.user.role, roles.truckOwner);
  assert.equal(result.user.phone, '+251922334455');
});

test('duplicate phone number registration is rejected with unique constraint error', async () => {
  const userRepository = new InMemoryUserRepository();
  const accountService = new AccountService({ userRepository });

  // First registration
  await accountService.syncProfile({
    authUser: { sub: 'auth-user-001' },
    role: roles.client,
    fullName: 'First User',
    email: 'first@example.com',
    phone: '+251911000001'
  });

  // Second user trying to register with the same phone
  await assert.rejects(
    async () => {
      await accountService.syncProfile({
        authUser: { sub: 'auth-user-002' },
        role: roles.truckOwner,
        fullName: 'Second User',
        email: 'second@example.com',
        phone: '+251911000001'
      });
    },
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.code, 'USER_UNIQUE_CONSTRAINT');
      assert.equal(err.statusCode, 409);
      return true;
    }
  );
});

test('OTP verification accepts correct code and activates session', () => {
  const otpManager = new MockOtpAuthManager();
  otpManager.requestOtp('+251911223344');

  const result = otpManager.verifyOtp('+251911223344', '123456');
  assert.equal(result.verified, true);
  assert.ok(result.sessionToken);
});

test('OTP verification rejects incorrect code with explicit error', () => {
  const otpManager = new MockOtpAuthManager();
  otpManager.requestOtp('+251911223344');

  assert.throws(
    () => otpManager.verifyOtp('+251911223344', '999999'),
    /incorrect verification code/i
  );
});

test('OTP verification rejects expired code with explicit notice', () => {
  const otpManager = new MockOtpAuthManager();
  otpManager.requestOtp('+251911223344');

  // Fast-forward OTP record past expiration
  const record = otpManager.otps.get('+251911223344');
  record.expiresAt = Date.now() - 1000;

  assert.throws(
    () => otpManager.verifyOtp('+251911223344', '123456'),
    /has expired/i
  );
});

test('OTP request enforces rate-limit cooldown before resend', () => {
  const otpManager = new MockOtpAuthManager();
  otpManager.requestOtp('+251911223344');

  // Immediately request again without cooldown elapsed
  assert.throws(
    () => otpManager.requestOtp('+251911223344'),
    /rate limit exceeded/i
  );
});

test('password requirement evaluation enforces strong security rules', () => {
  const weakPassword = evaluatePassword('weak');
  assert.equal(weakPassword.isStrong, false);
  assert.equal(weakPassword.hasMinLength, false);

  const missingUpper = evaluatePassword('weakpassword123!');
  assert.equal(missingUpper.isStrong, false);
  assert.equal(missingUpper.hasUppercase, false);

  const missingSymbolNumber = evaluatePassword('WeakPasswordOnly');
  assert.equal(missingSymbolNumber.isStrong, false);
  assert.equal(missingSymbolNumber.hasNumberOrSymbol, false);

  const strongPassword = evaluatePassword('StrongP@ssw0rd!');
  assert.equal(strongPassword.isStrong, true);
  assert.equal(strongPassword.hasMinLength, true);
  assert.equal(strongPassword.hasUppercase, true);
  assert.equal(strongPassword.hasLowercase, true);
  assert.equal(strongPassword.hasNumberOrSymbol, true);
});

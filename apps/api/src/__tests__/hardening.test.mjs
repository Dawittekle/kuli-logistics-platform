import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../common/errors/app-error.mjs';
import { InMemoryRateLimiter } from '../common/http/rate-limit.mjs';
import { withSecurityHeaders } from '../common/http/security-headers.mjs';
import { assertRuntimeConfig, validateRuntimeConfig } from '../config/release-readiness.mjs';

test('security headers are applied without removing response headers', () => {
  const headers = withSecurityHeaders({
    'content-type': 'application/json',
    'x-request-id': 'req_test'
  });

  assert.equal(headers['content-type'], 'application/json');
  assert.equal(headers['x-request-id'], 'req_test');
  assert.equal(headers['x-frame-options'], 'DENY');
  assert.equal(headers['x-content-type-options'], 'nosniff');
});

test('rate limiter blocks requests after configured threshold', () => {
  const limiter = new InMemoryRateLimiter({
    windowMs: 1000,
    maxRequests: 2
  });

  limiter.check({ key: 'client:/api/v1/quotes', now: 1000 });
  limiter.check({ key: 'client:/api/v1/quotes', now: 1001 });

  assert.throws(
    () => limiter.check({ key: 'client:/api/v1/quotes', now: 1002 }),
    (error) => error instanceof AppError && error.code === 'RATE_LIMITED'
  );

  limiter.check({ key: 'client:/api/v1/quotes', now: 2101 });
});

test('production runtime config fails closed for stub auth', () => {
  const config = {
    nodeEnv: 'production',
    mongodbUri: 'mongodb://localhost:27018/kuli',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'replace-me',
    supabaseJwtMode: 'development_stub',
    bootstrapAdminSupabaseUserId: '',
    bootstrapAdminEmail: ''
  };
  const readiness = validateRuntimeConfig(config);

  assert.equal(readiness.ok, false);
  assert.throws(() => assertRuntimeConfig(config), /Production runtime configuration failed/);
});

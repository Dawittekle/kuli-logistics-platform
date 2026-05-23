import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../common/errors/app-error.mjs';
import { createCorsHeaders, preflight } from '../common/http/cors.mjs';
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

test('cors headers are limited to configured browser origins', () => {
  const allowed = createCorsHeaders({
    origin: 'http://localhost:5173',
    allowedOrigins: ['http://localhost:5173']
  });

  assert.equal(allowed['access-control-allow-origin'], 'http://localhost:5173');
  assert.match(allowed['access-control-allow-headers'], /authorization/);
  assert.match(allowed['access-control-allow-methods'], /OPTIONS/);

  const blocked = createCorsHeaders({
    origin: 'https://not-kuli.example',
    allowedOrigins: ['http://localhost:5173']
  });

  assert.deepEqual(blocked, {});
});

test('cors preflight returns an empty success response', () => {
  const result = preflight({
    'access-control-allow-origin': 'http://localhost:5173'
  });

  assert.equal(result.statusCode, 204);
  assert.equal(result.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.equal(result.body, '');
});

test('development cors can allow local private network browser origins', () => {
  const allowed = createCorsHeaders({
    origin: 'http://192.168.8.6:5174',
    allowedOrigins: ['http://localhost:5174'],
    allowPrivateNetwork: true
  });

  assert.equal(allowed['access-control-allow-origin'], 'http://192.168.8.6:5174');

  const blocked = createCorsHeaders({
    origin: 'https://public.example',
    allowedOrigins: ['http://localhost:5174'],
    allowPrivateNetwork: true
  });

  assert.deepEqual(blocked, {});
});

test('private network cors remains disabled unless explicitly allowed', () => {
  const blocked = createCorsHeaders({
    origin: 'http://192.168.8.6:5174',
    allowedOrigins: ['http://localhost:5174'],
    allowPrivateNetwork: false
  });

  assert.deepEqual(blocked, {});
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

test('production runtime config fails closed for local demo auth', () => {
  const config = {
    nodeEnv: 'production',
    mongodbUri: 'mongodb://localhost:27018/kuli',
    supabaseUrl: 'https://kuli.supabase.co',
    supabaseAnonKey: 'anon-key',
    supabaseJwtMode: 'supabase',
    demoAuthEnabled: true,
    bootstrapAdminSupabaseUserId: 'admin-001',
    bootstrapAdminEmail: ''
  };
  const readiness = validateRuntimeConfig(config);

  assert.equal(readiness.ok, false);
  assert.equal(readiness.checks.find((check) => check.id === 'demo_auth_disabled')?.ok, false);
  assert.throws(() => assertRuntimeConfig(config), /demo_auth_disabled/);
});

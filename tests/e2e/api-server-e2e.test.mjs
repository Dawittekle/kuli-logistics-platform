import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// Configure environment before importing the API app
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_MODE = 'development_stub';
process.env.DEMO_AUTH_ENABLED = 'true';

const { handleRequest, getAppContext } = await import('../../apps/api/src/app.mjs');

let server;
let baseUrl;
let context;

before(async () => {
  context = await getAppContext();
  server = createServer((req, res) => handleRequest(req, res));

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (context?.mongoClient) {
    await context.mongoClient.close();
  }
});

test('health endpoint returns 200 OK', async () => {
  const res = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.status, 'ok');
});

test('GET /api/v1/config/public returns public runtime config', async () => {
  const res = await fetch(`${baseUrl}/api/v1/config/public`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.apiVersion, 'v1');
  assert.ok(body.data.features);
  assert.equal(typeof body.data.features.assistedBooking, 'boolean');
});

test('GET /api/v1/vehicle-classes returns active classes for booking', async () => {
  const res = await fetch(`${baseUrl}/api/v1/vehicle-classes`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length > 0);
});

test('unauthenticated request to protected /api/v1/me fails with 401 UNAUTHENTICATED', async () => {
  const res = await fetch(`${baseUrl}/api/v1/me`);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, 'UNAUTHENTICATED');
});

test('public registration rejects attempt to self-register as admin (403)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/sync-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer dev:admin-hack-attempt'
    },
    body: JSON.stringify({
      role: 'admin',
      fullName: 'Hacker Attempt',
      email: 'hacker@example.com',
      phone: '+251911999999'
    })
  });

  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error.code, 'PUBLIC_REGISTRATION_NOT_ALLOWED');
});

test('public registration successfully registers a legitimate client', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/sync-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer dev:client-e2e-user'
    },
    body: JSON.stringify({
      role: 'client',
      fullName: 'Abebe Bikila',
      email: 'abebe.client@example.com',
      phone: '+251911223344'
    })
  });

  assert.ok([200, 201].includes(res.status));
  const body = await res.json();
  assert.equal(body.data.user.role, 'client');
  assert.equal(body.data.user.phone, '+251911223344');
});

test('POST /api/v1/quotes calculates road distance, price breakdown and candidates for authenticated client', async () => {
  const res = await fetch(`${baseUrl}/api/v1/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer dev:client-e2e-user'
    },
    body: JSON.stringify({
      pickupLocation: {
        point: { type: 'Point', coordinates: [38.7578, 8.9806] },
        addressText: 'Bole Medhanialem, Addis Ababa'
      },
      destinationLocation: {
        point: { type: 'Point', coordinates: [38.7469, 9.0300] },
        addressText: 'Piazza, Addis Ababa'
      },
      loadDetails: {
        itemType: 'household_move',
        estimatedWeightKg: 500
      }
    })
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.data.quoteSnapshot);
  assert.ok(body.data.quoteSnapshot.totalEstimate > 0);
  assert.equal(body.data.quoteSnapshot.currency, 'ETB');
  assert.ok(body.data.route.distanceKm > 0);
  assert.ok(Array.isArray(body.data.candidates));
});

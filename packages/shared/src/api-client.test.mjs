import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KuliApiError, createKuliApiClient, normalizeApiBaseUrl } from './api-client.mjs';

describe('KULI API client', () => {
  it('normalizes API base URLs', () => {
    assert.equal(normalizeApiBaseUrl('http://localhost:4000/api/v1/'), 'http://localhost:4000/api/v1');
    assert.equal(normalizeApiBaseUrl(''), 'http://localhost:4000/api/v1');
  });

  it('unwraps successful response envelopes', async () => {
    const client = createKuliApiClient({
      baseUrl: 'http://api.test/api/v1',
      fetchImpl: async (url, options) => {
        assert.equal(url, 'http://api.test/api/v1/health');
        assert.equal(options.headers.Accept, 'application/json');

        return new Response(JSON.stringify({ data: { status: 'ok' }, meta: { requestId: 'req_1' } }), { status: 200 });
      }
    });

    assert.deepEqual(await client.health(), { data: { status: 'ok' }, meta: { requestId: 'req_1' } });
  });

  it('throws typed API errors for backend error envelopes', async () => {
    const client = createKuliApiClient({
      baseUrl: 'http://api.test/api/v1',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'INSUFFICIENT_ROLE',
              message: 'Forbidden',
              fieldErrors: { role: ['Admin required.'] }
            },
            meta: { requestId: 'req_2' }
          }),
          { status: 403 }
        )
    });

    await assert.rejects(client.me(), (error) => {
      assert.ok(error instanceof KuliApiError);
      assert.equal(error.status, 403);
      assert.equal(error.code, 'INSUFFICIENT_ROLE');
      assert.deepEqual(error.fieldErrors, { role: ['Admin required.'] });
      return true;
    });
  });
});

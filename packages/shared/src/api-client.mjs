export class KuliApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'KuliApiError';
    this.status = details.status ?? 0;
    this.code = details.code ?? 'API_ERROR';
    this.fieldErrors = details.fieldErrors ?? {};
    this.details = details.details ?? {};
    this.meta = details.meta ?? {};
  }
}

export const normalizeApiBaseUrl = (baseUrl) => {
  const trimmed = String(baseUrl ?? '').trim();

  if (!trimmed) {
    return 'http://localhost:4000/api/v1';
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const toJsonBody = (body) => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
};

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { data: text };
  }
};

const buildApiErrorMessage = ({ response, error, payload }) => {
  const requestId = payload.meta?.requestId;
  const suffix = requestId ? ` Request id: ${requestId}.` : '';

  if (error.code === 'INTERNAL_SERVER_ERROR') {
    return `The server could not finish that request. Please try again.${suffix}`;
  }

  if (error.code === 'USER_UNIQUE_CONSTRAINT') {
    const fields = Array.isArray(error.details?.fields) && error.details.fields.length > 0
      ? ` (${error.details.fields.join(', ')})`
      : '';

    return `That account detail is already used${fields}. Try signing in with the same email or change the value.${suffix}`;
  }

  if (response.status === 401) {
    return `Sign in again to continue.${suffix}`;
  }

  if (response.status === 403) {
    return `Your account does not have permission for that action.${suffix}`;
  }

  return `${error.message ?? `KULI API request failed with ${response.status}.`}${suffix}`;
};

export const createKuliApiClient = ({ baseUrl, getAccessToken, fetchImpl = globalThis.fetch } = {}) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to create the KULI API client.');
  }

  const resolvedBaseUrl = normalizeApiBaseUrl(baseUrl);

  const request = async (path, options = {}) => {
    const accessToken = await getAccessToken?.();
    const body = toJsonBody(options.body);
    const headers = {
      Accept: 'application/json',
      ...(body && !(typeof FormData !== 'undefined' && body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {})
    };

    let response;

    try {
      response = await fetchImpl(`${resolvedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
        method: options.method ?? 'GET',
        headers,
        body
      });
    } catch (error) {
      throw new KuliApiError(`Cannot reach the KULI API at ${resolvedBaseUrl}. Check that the backend is running, the app env URL is correct, and the API CORS settings allow this browser origin.`, {
        status: 0,
        code: 'NETWORK_ERROR',
        details: {
          originalError: error instanceof Error ? error.message : String(error)
        }
      });
    }

    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      const error = payload.error ?? {};

      throw new KuliApiError(buildApiErrorMessage({ response, error, payload }), {
        status: response.status,
        code: error.code,
        fieldErrors: error.fieldErrors,
        details: error.details,
        meta: payload.meta
      });
    }

    return payload;
  };

  return {
    baseUrl: resolvedBaseUrl,
    request,
    health: () => request('/health'),
    publicConfig: () => request('/config/public'),
    vehicleClasses: () => request('/vehicle-classes'),
    me: () => request('/me'),
    syncProfile: (profile) => request('/auth/sync-profile', { method: 'POST', body: profile })
  };
};

const defaultAllowedHeaders = [
  'authorization',
  'content-type',
  'idempotency-key',
  'x-request-id'
];

const defaultAllowedMethods = [
  'GET',
  'POST',
  'PATCH',
  'DELETE',
  'OPTIONS'
];

export const createCorsHeaders = ({ origin, allowedOrigins = [] } = {}) => {
  if (!origin) {
    return {};
  }

  const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

  if (!isAllowed) {
    return {};
  }

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': defaultAllowedMethods.join(', '),
    'access-control-allow-headers': defaultAllowedHeaders.join(', '),
    'access-control-max-age': '600',
    vary: 'Origin'
  };
};

export const preflight = (headers = {}) => ({
  statusCode: 204,
  headers,
  body: ''
});

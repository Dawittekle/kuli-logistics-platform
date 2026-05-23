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

const isPrivateNetworkHost = (hostname) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '::1' ||
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

const isPrivateNetworkOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && isPrivateNetworkHost(url.hostname);
  } catch {
    return false;
  }
};

export const createCorsHeaders = ({ origin, allowedOrigins = [], allowPrivateNetwork = false } = {}) => {
  if (!origin) {
    return {};
  }

  const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin) || (allowPrivateNetwork && isPrivateNetworkOrigin(origin));

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

export const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify(payload, null, 2)
});

export const success = (data, statusCode = 200, meta = {}) =>
  json(statusCode, {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });

export const failure = (error, meta = {}) =>
  json(error.statusCode ?? 500, {
    error: {
      code: error.code ?? 'INTERNAL_SERVER_ERROR',
      message: error.message ?? 'Unexpected server error.',
      details: error.details
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });


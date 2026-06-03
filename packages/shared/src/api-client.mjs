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

const ERROR_CODE_MAPPINGS = {
  // Authentication & Session
  'INVALID_TOKEN': {
    message: 'Your session has expired.',
    action: 'Please sign out and sign back in to continue.'
  },
  'UNAUTHENTICATED': {
    message: 'You are not signed in.',
    action: 'Please log in to your account.'
  },

  // Role & Permissions
  'CLIENT_REQUIRED': {
    message: 'Access denied.',
    action: 'This action can only be performed by Client accounts.'
  },
  'TRUCK_OWNER_REQUIRED': {
    message: 'Access denied.',
    action: 'This action can only be performed by Truck Owner accounts.'
  },
  'ASSISTANT_REQUIRED': {
    message: 'Access denied.',
    action: 'This feature is only available for hotline assistants or administrators.'
  },
  'ADMIN_REQUIRED': {
    message: 'Access denied.',
    action: 'This action requires administrative permissions.'
  },
  'STATUS_UPDATE_FORBIDDEN': {
    message: 'Permission denied.',
    action: 'Only the driver assigned to this trip or authorized staff can update its progress.'
  },

  // Hotline & Support Tickets
  'TICKET_CLOSED': {
    message: 'This support ticket has already been closed or cancelled.',
    action: 'You cannot make changes to resolved tickets. Please open a new hotline ticket.'
  },
  'HOTLINE_TICKET_NOT_FOUND': {
    message: 'Support ticket not found.',
    action: 'We could not find the ticket you requested. Please verify the ticket number.'
  },
  'INVALID_TICKET_TRANSITION': {
    message: 'Cannot change ticket status.',
    action: 'This ticket status change is not allowed in its current state. Please refresh and try again.'
  },
  'TICKET_ASSIGNED_TO_ANOTHER_ASSISTANT': {
    message: 'This ticket is claimed by someone else.',
    action: 'Another assistant has already taken this ticket. Please select a different ticket from the queue.'
  },
  'TICKET_NOT_READY_FOR_BOOKING': {
    message: 'Booking not ready.',
    action: 'The ticket must be claimed and marked in-progress before booking a truck. Please claim it first.'
  },

  // Matching & Vehicle Availability
  'NO_SELECTED_VEHICLES': {
    message: 'No trucks selected.',
    action: 'Please choose at least one verified truck from the list to send your request.'
  },
  'NO_ELIGIBLE_SELECTED_VEHICLES': {
    message: 'The selected trucks are no longer available.',
    action: 'The chosen trucks might have gone offline or accepted another job. Please refresh and select again.'
  },
  'DIRECT_ASSIGN_VEHICLE_NOT_AVAILABLE': {
    message: 'The selected truck is no longer available.',
    action: 'This truck has gone offline or is busy on another trip. Please choose a different vehicle.'
  },
  'VEHICLE_NOT_AVAILABLE': {
    message: 'Selected truck is not online or busy.',
    action: 'This truck cannot be assigned at the moment. Please select a different vehicle.'
  },
  'VEHICLE_NOT_VERIFIED': {
    message: 'Truck verification required.',
    action: 'Your truck must be approved by an administrator before going online. Please check your verification status.'
  },

  // Requests, Offers & Concurrency
  'KULI_REQUEST_NOT_FOUND': {
    message: 'Delivery request not found.',
    action: 'We could not locate this request. It may have been cancelled or completed. Please check your history.'
  },
  'REQUEST_NOT_ASSIGNABLE': {
    message: 'This request cannot be assigned.',
    action: 'The request has already been claimed or is no longer in a pending state.'
  },
  'REQUEST_CANNOT_BE_CANCELLED': {
    message: 'Unable to cancel trip.',
    action: 'This trip is already in progress and cannot be cancelled automatically. If there is an issue, please contact support.'
  },
  'OFFER_NOT_FOUND': {
    message: 'This job offer is no longer available.',
    action: 'The offer has expired or was deleted. Please check your Offers tab for new jobs.'
  },
  'OFFER_NOT_AVAILABLE': {
    message: 'This job offer has expired or was declined.',
    action: 'This offer is no longer open for acceptance. Please check the inbox for other active requests.'
  },
  'REQUEST_ALREADY_ACCEPTED': {
    message: 'Another driver accepted this job first.',
    action: 'This job has already been claimed. Don\'t worry, new delivery requests will appear in your inbox soon!'
  },
  'INVALID_STATUS_TRANSITION': {
    message: 'Cannot update trip status.',
    action: 'This status update is not allowed from the current state. Please refresh to see the updated status.'
  },

  // Document Uploads
  'DOCUMENT_UPLOAD_INVALID': {
    message: 'Document upload failed.',
    action: 'The file format or size is invalid. Please upload a clear JPEG, PNG, or PDF under 10MB.'
  },

  // System & Rate Limiting
  'RATE_LIMIT_EXCEEDED': {
    message: 'Too many requests.',
    action: 'You are doing that too fast. Please wait a moment and try again.'
  },
  'INTERNAL_SERVER_ERROR': {
    message: 'Something went wrong on our end.',
    action: 'Our server encountered an unexpected problem. We are looking into it. Please try again in a few moments.'
  }
};

const buildApiErrorMessage = ({ response, error, payload }) => {
  const requestId = payload.meta?.requestId;
  const suffix = requestId ? ` Request id: ${requestId}.` : '';

  if (error.code && ERROR_CODE_MAPPINGS[error.code]) {
    const { message, action } = ERROR_CODE_MAPPINGS[error.code];
    return `${message} ${action}${suffix}`;
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

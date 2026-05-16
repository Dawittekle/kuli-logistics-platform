export const roles = {
  client: 'client',
  truckOwner: 'truck_owner',
  assistant: 'assistant',
  admin: 'admin'
};

export const accountStatuses = {
  active: 'active',
  pendingVerification: 'pending_verification',
  suspended: 'suspended',
  banned: 'banned',
  deleted: 'deleted'
};

export const blockedAccountStatuses = [
  accountStatuses.suspended,
  accountStatuses.banned,
  accountStatuses.deleted
];

export const publicRegistrationRoles = [roles.client, roles.truckOwner];

export const routeVisibility = {
  mobileOnlyRoles: [roles.client, roles.truckOwner],
  staffOnlyRoles: [roles.assistant, roles.admin]
};

export const responseMeta = (requestId = 'local-request') => ({
  requestId,
  timestamp: new Date().toISOString()
});


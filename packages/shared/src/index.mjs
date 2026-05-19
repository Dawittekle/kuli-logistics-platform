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

export const verificationStatuses = {
  draft: 'draft',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected'
};

export const vehicleAvailabilityStatuses = {
  offline: 'offline',
  onlineAvailable: 'online_available',
  busyOnJob: 'busy_on_job',
  underMaintenance: 'under_maintenance',
  suspended: 'suspended'
};

export const vehicleDocumentTypes = {
  identity: 'identity',
  driverLicense: 'driver_license',
  vehicleRegistration: 'vehicle_registration',
  ownershipProof: 'ownership_proof',
  insurance: 'insurance',
  other: 'other'
};

export const fileLinkedEntityTypes = {
  vehicle: 'vehicle',
  report: 'report',
  profile: 'profile',
  message: 'message'
};

export const routeVisibility = {
  mobileOnlyRoles: [roles.client, roles.truckOwner],
  staffOnlyRoles: [roles.assistant, roles.admin]
};

export const responseMeta = (requestId = 'local-request') => ({
  requestId,
  timestamp: new Date().toISOString()
});

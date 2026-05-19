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

export const pricingRuleStatuses = {
  draft: 'draft',
  active: 'active',
  retired: 'retired'
};

export const locationSources = {
  gps: 'gps',
  manualPin: 'manual_pin',
  geocodedAddress: 'geocoded_address',
  assistantEntry: 'assistant_entry'
};

export const kuliStatuses = {
  pending: 'pending',
  accepted: 'accepted',
  enRouteToPickup: 'en_route_to_pickup',
  arrivedAtPickup: 'arrived_at_pickup',
  loading: 'loading',
  inTransit: 'in_transit',
  unloading: 'unloading',
  completed: 'completed',
  cancelled: 'cancelled',
  timedOut: 'timed_out'
};

export const offerStatuses = {
  sent: 'sent',
  viewed: 'viewed',
  accepted: 'accepted',
  declined: 'declined',
  expired: 'expired',
  cancelled: 'cancelled'
};

export const ticketStatuses = {
  open: 'open',
  assigned: 'assigned',
  inProgress: 'in_progress',
  pendingClient: 'pending_client',
  closed: 'closed',
  cancelled: 'cancelled'
};

export const ticketSources = {
  incomingCall: 'incoming_call',
  missedCall: 'missed_call',
  manual: 'manual'
};

export const paymentStatuses = {
  notRequired: 'not_required',
  pending: 'pending',
  confirmedByOwner: 'confirmed_by_owner',
  disputed: 'disputed',
  resolved: 'resolved',
  cancelled: 'cancelled'
};

export const paymentFlows = {
  payOnAcceptance: 'pay_on_acceptance',
  payOnDelivery: 'pay_on_delivery',
  payInAdvance: 'pay_in_advance'
};

export const paymentMethods = {
  cash: 'cash',
  manual: 'manual',
  digitalGateway: 'digital_gateway'
};

export const ratingModerationStatuses = {
  visible: 'visible',
  hidden: 'hidden',
  flagged: 'flagged'
};

export const reportStatuses = {
  open: 'open',
  underReview: 'under_review',
  awaitingResponse: 'awaiting_response',
  resolved: 'resolved',
  rejected: 'rejected'
};

export const reportCategories = {
  overcharge: 'overcharge',
  noShow: 'no_show',
  misconduct: 'misconduct',
  damage: 'damage',
  safety: 'safety',
  platformIssue: 'platform_issue',
  other: 'other'
};

export const reportResolutionOutcomes = {
  warning: 'warning',
  suspension: 'suspension',
  rejected: 'rejected',
  resolvedNoAction: 'resolved_no_action',
  refundRecommended: 'refund_recommended',
  visibilityPenalty: 'visibility_penalty'
};

export const routeVisibility = {
  mobileOnlyRoles: [roles.client, roles.truckOwner],
  staffOnlyRoles: [roles.assistant, roles.admin]
};

export const responseMeta = (requestId = 'local-request') => ({
  requestId,
  timestamp: new Date().toISOString()
});

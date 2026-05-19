import { vehicleAvailabilityStatuses, verificationStatuses } from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';

export const vehicleAvailabilityTransitions = {
  [vehicleAvailabilityStatuses.offline]: [
    vehicleAvailabilityStatuses.onlineAvailable,
    vehicleAvailabilityStatuses.underMaintenance,
    vehicleAvailabilityStatuses.suspended
  ],
  [vehicleAvailabilityStatuses.onlineAvailable]: [
    vehicleAvailabilityStatuses.offline,
    vehicleAvailabilityStatuses.busyOnJob,
    vehicleAvailabilityStatuses.underMaintenance,
    vehicleAvailabilityStatuses.suspended
  ],
  [vehicleAvailabilityStatuses.busyOnJob]: [
    vehicleAvailabilityStatuses.onlineAvailable,
    vehicleAvailabilityStatuses.offline,
    vehicleAvailabilityStatuses.underMaintenance
  ],
  [vehicleAvailabilityStatuses.underMaintenance]: [
    vehicleAvailabilityStatuses.offline,
    vehicleAvailabilityStatuses.suspended
  ],
  [vehicleAvailabilityStatuses.suspended]: [vehicleAvailabilityStatuses.offline]
};

export const assertVehicleAvailabilityTransition = ({ vehicle, nextAvailabilityStatus }) => {
  const allowed = vehicleAvailabilityTransitions[vehicle.availabilityStatus] ?? [];

  if (!Object.values(vehicleAvailabilityStatuses).includes(nextAvailabilityStatus)) {
    throw new AppError(422, 'INVALID_VEHICLE_AVAILABILITY_STATUS', 'Unknown vehicle availability status.', {
      attemptedStatus: nextAvailabilityStatus
    });
  }

  if (!allowed.includes(nextAvailabilityStatus)) {
    throw new AppError(422, 'INVALID_VEHICLE_AVAILABILITY_TRANSITION', 'This vehicle availability transition is not allowed.', {
      fromStatus: vehicle.availabilityStatus,
      toStatus: nextAvailabilityStatus
    });
  }

  if (
    nextAvailabilityStatus === vehicleAvailabilityStatuses.onlineAvailable &&
    vehicle.verificationStatus !== verificationStatuses.approved
  ) {
    throw new AppError(422, 'VEHICLE_NOT_VERIFIED', 'Only approved vehicles can go online.', {
      verificationStatus: vehicle.verificationStatus
    });
  }
};

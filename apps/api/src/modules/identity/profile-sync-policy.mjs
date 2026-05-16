import { publicRegistrationRoles, roles } from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';

export const isPublicRegistrationRole = (role) => publicRegistrationRoles.includes(role);

export const assertPublicRegistrationRole = (role) => {
  if (!isPublicRegistrationRole(role)) {
    throw new AppError(
      403,
      'PUBLIC_REGISTRATION_NOT_ALLOWED',
      'Only client and truck owner accounts can be created through public registration.',
      { attemptedRole: role }
    );
  }
};

export const normalizeRequestedRole = (role) => {
  if (role === 'truckOwner') {
    return roles.truckOwner;
  }

  return role;
};

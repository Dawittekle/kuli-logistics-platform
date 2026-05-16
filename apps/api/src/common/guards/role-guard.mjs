import { AppError } from '../errors/app-error.mjs';

export const assertRole = (user, allowedRoles) => {
  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resource.', {
      allowedRoles
    });
  }
};


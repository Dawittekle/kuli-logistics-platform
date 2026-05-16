import { AppError } from '../errors/app-error.mjs';
import { blockedAccountStatuses } from '../../../../../packages/shared/src/index.mjs';

export const assertActiveAccount = (user) => {
  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  if (blockedAccountStatuses.includes(user.accountStatus)) {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account is not allowed to perform this action.', {
      accountStatus: user.accountStatus
    });
  }
};

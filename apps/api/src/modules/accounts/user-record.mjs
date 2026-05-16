import { accountStatuses } from '../../../../../packages/shared/src/index.mjs';

export const createUserRecord = ({
  id,
  supabaseUserId,
  role,
  fullName,
  email,
  phone,
  createdByAdminId = undefined,
  accountStatus = accountStatuses.active
}) => ({
  id,
  supabaseUserId,
  role,
  accountStatus,
  fullName,
  email,
  phone,
  notificationPreferences: {
    push: true,
    sms: true,
    email: true,
    marketing: false
  },
  staffMeta: createdByAdminId
    ? {
        createdByAdminId,
        lastPrivilegedLoginAt: null
      }
    : undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

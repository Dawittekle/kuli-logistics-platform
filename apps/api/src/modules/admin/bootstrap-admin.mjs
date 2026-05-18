import { roles } from '../../../../../packages/shared/src/index.mjs';

export const bootstrapAdmin = async ({ accountService, config }) => {
  if (!config.bootstrapAdminSupabaseUserId) {
    return null;
  }

  const existing = await accountService.userRepository.findBySupabaseUserId(config.bootstrapAdminSupabaseUserId);

  if (existing) {
    return existing;
  }

  return accountService.userRepository.save({
    id: 'usr_admin_seed',
    supabaseUserId: config.bootstrapAdminSupabaseUserId,
    role: roles.admin,
    accountStatus: 'active',
    fullName: config.bootstrapAdminFullName,
    email: config.bootstrapAdminEmail || undefined,
    phone: undefined,
    notificationPreferences: {
      push: true,
      sms: true,
      email: true,
      marketing: false
    },
    staffMeta: {
      createdByAdminId: null,
      lastPrivilegedLoginAt: null
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

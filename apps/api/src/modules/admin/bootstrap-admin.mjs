import { roles } from '../../../../../packages/shared/src/index.mjs';

export const bootstrapAdmin = async ({ accountService, config }) => {
  if (!config.bootstrapAdminSupabaseUserId) {
    return null;
  }

  const existingBySupabaseId =
  await accountService.userRepository.findBySupabaseUserId(
    config.bootstrapAdminSupabaseUserId
  );

if (existingBySupabaseId) {
  return existingBySupabaseId;
}

if (config.bootstrapAdminEmail) {
  const existingByEmail =
    await accountService.userRepository.findByEmail(config.bootstrapAdminEmail);

  if (existingByEmail) {
    return accountService.userRepository.save({
      ...existingByEmail,
      supabaseUserId: config.bootstrapAdminSupabaseUserId,
      role: roles.admin,
      accountStatus: 'active',
      fullName: existingByEmail.fullName || config.bootstrapAdminFullName,
      staffMeta: existingByEmail.staffMeta ?? {
        createdByAdminId: null,
        lastPrivilegedLoginAt: null
      }
    });
  }
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

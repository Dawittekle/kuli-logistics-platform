import { roles } from '../../../../../packages/shared/src/index.mjs';

export const bootstrapAdmin = async ({ accountService, config }) => {
  if (!config.bootstrapAdminSupabaseUserId) {
    return null;
  }

  const existingBySupabaseId = await accountService.userRepository.findBySupabaseUserId(
  config.bootstrapAdminSupabaseUserId
);

if (existingBySupabaseId) {
  return existingBySupabaseId;
}

if (config.bootstrapAdminEmail) {
  const existingByEmail = await accountService.userRepository.findByEmail(
    config.bootstrapAdminEmail
  );

  if (existingByEmail) {
    // GUARDRAIL 1: Prevent overwriting an existing, different Supabase ID
    if (
      existingByEmail.supabaseUserId && 
      existingByEmail.supabaseUserId !== config.bootstrapAdminSupabaseUserId
    ) {
      throw new Error(
        `Bootstrap Error: The email ${config.bootstrapAdminEmail} is already linked to a different Supabase account. Cannot safely bootstrap.`
      );
    }

    // GUARDRAIL 2: Prevent reactivating banned or suspended accounts
    if (['banned', 'suspended'].includes(existingByEmail.accountStatus)) {
       throw new Error(
        `Bootstrap Error: The account for ${config.bootstrapAdminEmail} is currently ${existingByEmail.accountStatus}.`
      );
    }

    // If we pass the guardrails, it is safe to update and elevate the user
    const updatedUser = await accountService.userRepository.save({
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

    return updatedUser;
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

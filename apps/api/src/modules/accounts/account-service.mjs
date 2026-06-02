import { roles, accountStatuses } from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';
import { createUserRecord } from './user-record.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const pickDefined = (value, fallback) => (value === undefined ? fallback : value);
const cleanOptional = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const cleanEmail = (value) => cleanOptional(value)?.toLowerCase();

const isDuplicateKeyError = (error) => error?.code === 11000 || error?.code === 11001;

const saveUserOrConflict = async (userRepository, user) => {
  try {
    return await userRepository.save(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const fields = Object.keys(error.keyPattern ?? error.keyValue ?? {});

      throw new AppError(409, 'USER_UNIQUE_CONSTRAINT', 'A user with that email, phone, or auth identity already exists.', {
        fields
      });
    }

    throw error;
  }
};

export class AccountService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async syncProfile({ authUser, role, fullName, email, phone }) {
    const existingUser = await this.resolveUserForAuthIdentity(authUser);
    const normalizedEmail = cleanEmail(email ?? authUser.email);
    const normalizedPhone = cleanOptional(phone ?? authUser.phone);

    if (existingUser) {
      const updatedUser = await saveUserOrConflict(this.userRepository, {
        ...existingUser,
        supabaseUserId: authUser.sub,
        fullName: pickDefined(fullName, existingUser.fullName),
        email: pickDefined(normalizedEmail, existingUser.email),
        phone: pickDefined(normalizedPhone, existingUser.phone)
      });

      return {
        user: updatedUser,
        created: false
      };
    }

    const user = createUserRecord({
      id: createId('usr'),
      supabaseUserId: authUser.sub,
      role,
      fullName,
      email: normalizedEmail,
      phone: normalizedPhone
    });

    return {
      user: await saveUserOrConflict(this.userRepository, user),
      created: true
    };
  }

  async getCurrentUser(authUser) {
    const user = await this.resolveUserForAuthIdentity(authUser);

    if (!user) {
      throw new AppError(404, 'PROFILE_NOT_FOUND', 'No application profile exists for this identity.');
    }

    return user;
  }

  async resolveUserForAuthIdentity(authUser) {
    const user = await this.userRepository.findBySupabaseUserId(authUser.sub);

    if (user) {
      return user;
    }

    const normalizedEmail = cleanEmail(authUser.email);

    if (!normalizedEmail || !this.userRepository.findByEmail) {
      return null;
    }

    const emailUser = await this.userRepository.findByEmail(normalizedEmail);

    if (!emailUser) {
      return null;
    }

    return saveUserOrConflict(this.userRepository, {
      ...emailUser,
      supabaseUserId: authUser.sub,
      email: normalizedEmail,
      authRelinkedAt: new Date().toISOString()
    });
  }

  async updateOwnProfile(authUser, input) {
    const user = await this.getCurrentUser(authUser);

    return this.userRepository.save({
      ...user,
      fullName: pickDefined(input.fullName, user.fullName),
      email: pickDefined(input.email, user.email),
      phone: pickDefined(input.phone, user.phone),
      notificationPreferences: input.notificationPreferences
        ? {
            ...user.notificationPreferences,
            ...input.notificationPreferences
          }
        : user.notificationPreferences
    });
  }

  async listUsers() {
    return this.userRepository.list();
  }

  async getUser({ actor, targetUserId }) {
    if (actor.role !== roles.admin) {
      throw new AppError(403, 'ADMIN_REQUIRED', 'Only admins can inspect user records.');
    }

    const user = await this.userRepository.findById(targetUserId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Target user was not found.');
    }

    return user;
  }

  async setAccountStatus({ actor, targetUserId, accountStatus }) {
    if (!Object.values(accountStatuses).includes(accountStatus)) {
      throw new AppError(422, 'INVALID_ACCOUNT_STATUS', 'Unknown account status.', {
        attemptedStatus: accountStatus
      });
    }

    const targetUser = await this.userRepository.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Target user was not found.');
    }

    if (targetUser.role === roles.admin && actor.id !== targetUser.id) {
      throw new AppError(403, 'ADMIN_PROTECTION', 'Admins cannot change another admin in this scaffold.');
    }

    return this.userRepository.save({
      ...targetUser,
      accountStatus
    });
  }

  async setOwnerActiveVehicle({ actor, activeVehicleId }) {
    if (actor.role !== roles.truckOwner) {
      throw new AppError(403, 'TRUCK_OWNER_REQUIRED', 'Only truck owners can set an active vehicle.');
    }

    return this.userRepository.save({
      ...actor,
      activeVehicleId: activeVehicleId || undefined
    });
  }

  async provisionStaffUser({ actor, supabaseUserId, role, fullName, email, phone }) {
    if (![roles.admin, roles.assistant].includes(role)) {
      throw new AppError(422, 'INVALID_STAFF_ROLE', 'Only admin or assistant roles can be provisioned through staff flow.');
    }

    const existingUser = await this.userRepository.findBySupabaseUserId(supabaseUserId);

    if (existingUser) {
      throw new AppError(409, 'USER_ALREADY_EXISTS', 'A user profile already exists for this Supabase identity.');
    }

    return this.userRepository.save(
      createUserRecord({
        id: createId('usr'),
        supabaseUserId,
        role,
        fullName,
        email,
        phone,
        createdByAdminId: actor.id
      })
    );
  }

  async upsertDemoProfile({ supabaseUserId, role, fullName, email, phone, preserveExistingRole = false }) {
    if (role !== undefined && !Object.values(roles).includes(role)) {
      throw new AppError(422, 'INVALID_ROLE', 'Unknown demo role.');
    }

    const normalizedEmail = cleanEmail(email);
    const normalizedPhone = cleanOptional(phone);
    const existingUser =
      (await this.userRepository.findBySupabaseUserId(supabaseUserId)) ??
      (normalizedEmail && this.userRepository.findByEmail ? await this.userRepository.findByEmail(normalizedEmail) : null);

    if (existingUser) {
      const nextRole = preserveExistingRole ? existingUser.role : role;
      const nextSupabaseUserId = preserveExistingRole ? existingUser.supabaseUserId : supabaseUserId;

      if (!nextRole) {
        throw new AppError(422, 'INVALID_ROLE', 'A demo role is required for new demo profiles.');
      }

      return saveUserOrConflict(this.userRepository, {
        ...existingUser,
        supabaseUserId: nextSupabaseUserId,
        role: nextRole,
        accountStatus: accountStatuses.active,
        fullName: pickDefined(cleanOptional(fullName), existingUser.fullName),
        email: pickDefined(normalizedEmail, existingUser.email),
        phone: pickDefined(normalizedPhone, existingUser.phone)
      });
    }

    if (!role) {
      throw new AppError(422, 'INVALID_ROLE', 'A demo role is required for new demo profiles.');
    }

    return saveUserOrConflict(
      this.userRepository,
      createUserRecord({
        id: createId('usr_demo'),
        supabaseUserId,
        role,
        fullName: cleanOptional(fullName),
        email: normalizedEmail,
        phone: normalizedPhone,
        createdByAdminId: [roles.admin, roles.assistant].includes(role) ? 'local_demo' : undefined
      })
    );
  }
}

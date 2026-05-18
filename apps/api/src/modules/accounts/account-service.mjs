import { roles, accountStatuses } from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';
import { createUserRecord } from './user-record.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const pickDefined = (value, fallback) => (value === undefined ? fallback : value);

export class AccountService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async syncProfile({ authUser, role, fullName, email, phone }) {
    const existingUser = await this.userRepository.findBySupabaseUserId(authUser.sub);

    if (existingUser) {
      const updatedUser = await this.userRepository.save({
        ...existingUser,
        fullName: pickDefined(fullName, existingUser.fullName),
        email: pickDefined(email ?? authUser.email, existingUser.email),
        phone: pickDefined(phone ?? authUser.phone, existingUser.phone)
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
      email: email ?? authUser.email,
      phone: phone ?? authUser.phone
    });

    return {
      user: await this.userRepository.save(user),
      created: true
    };
  }

  async getCurrentUser(authUser) {
    const user = await this.userRepository.findBySupabaseUserId(authUser.sub);

    if (!user) {
      throw new AppError(404, 'PROFILE_NOT_FOUND', 'No application profile exists for this identity.');
    }

    return user;
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
}

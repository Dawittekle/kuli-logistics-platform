export class InMemoryUserRepository {
  constructor() {
    this.usersById = new Map();
    this.userIdsBySupabaseUserId = new Map();
  }

  async list() {
    return Array.from(this.usersById.values());
  }

  async findById(id) {
    return this.usersById.get(id) ?? null;
  }

  async findBySupabaseUserId(supabaseUserId) {
    const id = this.userIdsBySupabaseUserId.get(supabaseUserId);
    return id ? this.findById(id) : null;
  }

  async findByEmail(email) {
    return Array.from(this.usersById.values()).find((user) => user.email === email) ?? null;
  }

  async findByPhone(phone) {
    return Array.from(this.usersById.values()).find((user) => user.phone === phone) ?? null;
  }

  async save(user) {
    // Check phone uniqueness constraint (emulates MongoDB 11000 / Postgres UNIQUE)
    if (user.phone) {
      const existingPhoneUser = Array.from(this.usersById.values()).find(
        (u) => u.phone === user.phone && u.id !== user.id
      );
      if (existingPhoneUser) {
        const error = new Error('E11000 duplicate key error collection: kuli.users index: users_phone_unique');
        error.code = 11000;
        error.keyPattern = { phone: 1 };
        throw error;
      }
    }

    const record = {
      ...user,
      updatedAt: new Date().toISOString()
    };

    this.usersById.set(record.id, record);
    this.userIdsBySupabaseUserId.set(record.supabaseUserId, record.id);

    return record;
  }
}

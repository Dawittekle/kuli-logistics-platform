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

  async save(user) {
    const record = {
      ...user,
      updatedAt: new Date().toISOString()
    };

    this.usersById.set(record.id, record);
    this.userIdsBySupabaseUserId.set(record.supabaseUserId, record.id);

    return record;
  }
}

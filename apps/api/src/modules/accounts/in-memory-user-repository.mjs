export class InMemoryUserRepository {
  constructor() {
    this.usersById = new Map();
    this.userIdsBySupabaseUserId = new Map();
  }

  list() {
    return Array.from(this.usersById.values());
  }

  findById(id) {
    return this.usersById.get(id) ?? null;
  }

  findBySupabaseUserId(supabaseUserId) {
    const id = this.userIdsBySupabaseUserId.get(supabaseUserId);
    return id ? this.findById(id) : null;
  }

  save(user) {
    const record = {
      ...user,
      updatedAt: new Date().toISOString()
    };

    this.usersById.set(record.id, record);
    this.userIdsBySupabaseUserId.set(record.supabaseUserId, record.id);

    return record;
  }
}


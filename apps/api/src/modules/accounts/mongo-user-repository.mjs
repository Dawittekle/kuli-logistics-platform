const usersCollectionName = 'users';

const normalizeMongoUser = (document) => {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;

  return {
    id: String(_id),
    ...rest
  };
};

export class MongoUserRepository {
  constructor({ db }) {
    this.collection = db.collection(usersCollectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { supabaseUserId: 1 },
        unique: true,
        name: 'users_supabase_user_id_unique'
      },
      {
        key: { email: 1 },
        unique: true,
        sparse: true,
        name: 'users_email_unique'
      },
      {
        key: { phone: 1 },
        unique: true,
        sparse: true,
        name: 'users_phone_unique'
      },
      {
        key: { role: 1, accountStatus: 1 },
        name: 'users_role_status_idx'
      }
    ]);
  }

  async list() {
    const documents = await this.collection.find({}, { sort: { createdAt: 1 } }).toArray();
    return documents.map(normalizeMongoUser);
  }

  async findById(id) {
    return normalizeMongoUser(await this.collection.findOne({ _id: id }));
  }

  async findBySupabaseUserId(supabaseUserId) {
    return normalizeMongoUser(await this.collection.findOne({ supabaseUserId }));
  }

  async save(user) {
    const now = new Date().toISOString();
    const record = {
      ...user,
      createdAt: user.createdAt ?? now,
      updatedAt: now
    };
    const { id, ...document } = record;

    await this.collection.replaceOne(
      { _id: id },
      {
        _id: id,
        ...document
      },
      { upsert: true }
    );

    return normalizeMongoUser(await this.collection.findOne({ _id: id }));
  }
}

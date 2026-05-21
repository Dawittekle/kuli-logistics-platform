const collectionName = 'device_tokens';

const normalize = (document) => {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;
  return {
    id: String(_id),
    ...rest
  };
};

export class MongoDeviceTokenRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { userId: 1, token: 1 },
        unique: true,
        name: 'device_tokens_user_token_unique'
      },
      {
        key: { userId: 1, updatedAt: -1 },
        name: 'device_tokens_user_updated_idx'
      }
    ]);
  }

  async save(deviceToken) {
    const now = new Date().toISOString();
    const record = {
      ...deviceToken,
      createdAt: deviceToken.createdAt ?? now,
      updatedAt: now
    };
    const { id, ...document } = record;

    await this.collection.replaceOne(
      {
        userId: record.userId,
        token: record.token
      },
      {
        _id: id,
        ...document
      },
      { upsert: true }
    );

    return normalize(await this.collection.findOne({ userId: record.userId, token: record.token }));
  }

  async deleteForUser({ id, userId }) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: id,
        userId,
        deletedAt: { $exists: false }
      },
      {
        $set: {
          deletedAt: new Date().toISOString()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }
}

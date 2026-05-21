const collectionName = 'files';

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

export class MongoFileRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { linkedEntityType: 1, linkedEntityId: 1 },
        name: 'files_linked_entity_idx'
      },
      {
        key: { ownerId: 1, createdAt: -1 },
        name: 'files_owner_created_idx'
      }
    ]);
  }

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id, deletedAt: { $exists: false } }));
  }

  async complete({ fileId, update = {} }) {
    const now = new Date().toISOString();
    const result = await this.collection.findOneAndUpdate(
      {
        _id: fileId,
        deletedAt: { $exists: false }
      },
      {
        $set: {
          ...update,
          status: 'uploaded',
          completedAt: now,
          updatedAt: now
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }

  async save(fileRecord) {
    const now = new Date().toISOString();
    const record = {
      ...fileRecord,
      createdAt: fileRecord.createdAt ?? now
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

    return this.findById(id);
  }
}

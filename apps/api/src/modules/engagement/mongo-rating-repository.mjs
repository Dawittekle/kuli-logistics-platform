const collectionName = 'ratings';

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

export class MongoRatingRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { requestId: 1, raterId: 1, targetOwnerId: 1 },
        unique: true,
        name: 'ratings_request_rater_owner_unique'
      },
      {
        key: { targetOwnerId: 1, createdAt: -1 },
        name: 'ratings_owner_created_idx'
      },
      {
        key: { targetOwnerId: 1, rating: -1 },
        name: 'ratings_owner_rating_idx'
      }
    ]);
  }

  async findByRequestRaterAndOwner({ requestId, raterId, targetOwnerId }) {
    return normalize(await this.collection.findOne({ requestId, raterId, targetOwnerId }));
  }

  async save(rating) {
    const now = new Date().toISOString();
    const record = {
      ...rating,
      createdAt: rating.createdAt ?? now,
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

    return normalize(await this.collection.findOne({ _id: id }));
  }

  async listByOwnerId(targetOwnerId) {
    const documents = await this.collection
      .find({ targetOwnerId }, { sort: { createdAt: -1 }, limit: 100 })
      .toArray();
    return documents.map(normalize);
  }
}

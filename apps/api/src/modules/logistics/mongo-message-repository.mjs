const collectionName = 'messages';

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

export class MongoMessageRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { requestId: 1, createdAt: 1 },
        name: 'messages_request_created_idx'
      },
      {
        key: { senderId: 1, clientGeneratedId: 1 },
        unique: true,
        sparse: true,
        name: 'messages_sender_client_generated_unique'
      }
    ]);
  }

  async findBySenderAndClientGeneratedId({ senderId, clientGeneratedId }) {
    if (!clientGeneratedId) {
      return null;
    }

    return normalize(await this.collection.findOne({ senderId, clientGeneratedId, deletedAt: { $exists: false } }));
  }

  async insert(message) {
    const now = new Date().toISOString();
    const { id, ...document } = {
      ...message,
      readBy: message.readBy ?? [],
      createdAt: message.createdAt ?? now
    };

    await this.collection.insertOne({
      _id: id,
      ...document
    });

    return normalize(await this.collection.findOne({ _id: id }));
  }

  async listByRequestId(requestId) {
    const documents = await this.collection
      .find({ requestId, deletedAt: { $exists: false } }, { sort: { createdAt: 1 } })
      .toArray();
    return documents.map(normalize);
  }
}

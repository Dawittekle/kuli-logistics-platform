const collectionName = 'kuli_status_events';

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

export class MongoKuliStatusEventRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { requestId: 1, createdAt: 1 },
        name: 'kuli_status_events_request_created_idx'
      },
      {
        key: { actorUserId: 1, createdAt: -1 },
        name: 'kuli_status_events_actor_created_idx'
      }
    ]);
  }

  async insert(event) {
    const now = new Date().toISOString();
    const { id, ...document } = {
      ...event,
      createdAt: event.createdAt ?? now
    };

    await this.collection.insertOne({
      _id: id,
      ...document
    });

    return normalize(await this.collection.findOne({ _id: id }));
  }

  async listByRequestId(requestId) {
    const documents = await this.collection.find({ requestId }, { sort: { createdAt: 1 } }).toArray();
    return documents.map(normalize);
  }
}

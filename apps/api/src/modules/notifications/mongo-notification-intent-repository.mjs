const collectionName = 'notification_intents';

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

export class MongoNotificationIntentRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { channel: 1, status: 1, createdAt: 1 },
        name: 'notification_intents_channel_status_created_idx'
      },
      {
        key: { requestId: 1, type: 1 },
        name: 'notification_intents_request_type_idx'
      },
      {
        key: { ticketId: 1, type: 1 },
        name: 'notification_intents_ticket_type_idx'
      }
    ]);
  }

  async insert(intent) {
    const now = new Date().toISOString();
    const { id, ...document } = {
      ...intent,
      status: intent.status ?? 'pending',
      createdAt: intent.createdAt ?? now,
      updatedAt: now
    };

    await this.collection.insertOne({
      _id: id,
      ...document
    });

    return normalize(await this.collection.findOne({ _id: id }));
  }
}

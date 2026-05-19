const collectionName = 'notifications';

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

export class MongoNotificationRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { recipientUserId: 1, createdAt: -1 },
        name: 'notifications_recipient_created_idx'
      },
      {
        key: { deliveryStatus: 1, createdAt: 1 },
        name: 'notifications_status_created_idx'
      }
    ]);
  }

  async insertMany(notifications) {
    if (notifications.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const documents = notifications.map(({ id, ...notification }) => ({
      _id: id,
      ...notification,
      createdAt: notification.createdAt ?? now,
      updatedAt: now
    }));

    await this.collection.insertMany(documents);
    return documents.map(normalize);
  }

  async listByRecipientId(recipientUserId) {
    const documents = await this.collection
      .find({ recipientUserId }, { sort: { createdAt: -1 }, limit: 50 })
      .toArray();

    return documents.map(normalize);
  }

  async markRead({ notificationId, recipientUserId }) {
    const now = new Date().toISOString();
    const result = await this.collection.findOneAndUpdate(
      {
        _id: notificationId,
        recipientUserId
      },
      {
        $set: {
          deliveryStatus: 'read',
          readAt: now,
          updatedAt: now
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }
}

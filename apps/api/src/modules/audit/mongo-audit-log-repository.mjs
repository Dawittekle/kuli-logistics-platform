const collectionName = 'audit_logs';

export class MongoAuditLogRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { createdAt: -1 },
        name: 'audit_logs_created_idx'
      },
      {
        key: { actorUserId: 1, createdAt: -1 },
        name: 'audit_logs_actor_created_idx'
      },
      {
        key: { targetType: 1, targetId: 1, createdAt: -1 },
        name: 'audit_logs_target_created_idx'
      },
      {
        key: { action: 1, createdAt: -1 },
        name: 'audit_logs_action_created_idx'
      }
    ]);
  }

  async write(entry) {
    const record = {
      id: entry.id,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata ?? {},
      createdAt: entry.createdAt ?? new Date().toISOString()
    };
    const { id, ...document } = record;

    await this.collection.insertOne({
      _id: id,
      ...document
    });

    return record;
  }
}

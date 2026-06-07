import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const collectionName = 'notifications';
const defaultEmailLogPath = '/tmp/kuli-sent-emails.log';

const getEmailLogPath = () => process.env.EMAIL_LOG_PATH || defaultEmailLogPath;

const appendEmailLog = (logEntry) => {
  const logPath = getEmailLogPath();
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, logEntry, 'utf8');
};

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
    this.db = db;
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
    const recipientUserIds = [...new Set(notifications.map(n => n.recipientUserId))];
    const users = await this.db.collection('users').find({ _id: { $in: recipientUserIds } }).toArray();
    const userMap = new Map(users.map(u => [String(u._id), u]));

    const documents = [];

    for (const { id, ...notification } of notifications) {
      const recipient = userMap.get(String(notification.recipientUserId));
      const hasEmailPref = recipient?.notificationPreferences;
      let emailEnabled = true; // Default to true if not specified
      if (hasEmailPref) {
        if (hasEmailPref.emailEnabled !== undefined) {
          emailEnabled = Boolean(hasEmailPref.emailEnabled);
        } else if (hasEmailPref.email !== undefined) {
          emailEnabled = Boolean(hasEmailPref.email);
        }
      }

      const recipientEmail = recipient?.email;
      const channels = [...(notification.channels ?? ['in_app'])];
      let emailDeliveryStatus = undefined;

      if (emailEnabled && recipientEmail) {
        if (!channels.includes('email')) {
          channels.push('email');
        }
        emailDeliveryStatus = 'sent';

        const logEntry = `================================================================================
Date: ${now}
To: ${recipientEmail}
Subject: ${notification.title}
Body: ${notification.body}
Data: ${JSON.stringify(notification.data ?? {})}
================================================================================\n\n`;

        try {
          appendEmailLog(logEntry);
        } catch (err) {
          console.error('Failed to write to sent_emails.log:', err);
        }
      }

      documents.push({
        _id: id,
        ...notification,
        channels,
        emailDeliveryStatus,
        createdAt: notification.createdAt ?? now,
        updatedAt: now
      });
    }

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

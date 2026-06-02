import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { MongoNotificationRepository } from '../modules/notifications/mongo-notification-repository.mjs';

test('MongoNotificationRepository insertMany sends email when enabled', async () => {
  const users = [
    {
      _id: 'usr_001',
      email: 'user1@example.com',
      notificationPreferences: {
        emailEnabled: true
      }
    },
    {
      _id: 'usr_002',
      email: 'user2@example.com',
      notificationPreferences: {
        emailEnabled: false
      }
    }
  ];

  const notificationsCollection = {
    async insertMany(docs) {
      this.inserted = docs;
      return { acknowledged: true };
    }
  };

  const db = {
    collection(name) {
      if (name === 'users') {
        return {
          find(query) {
            const ids = query._id.$in;
            const matches = users.filter(u => ids.includes(u._id));
            return {
              async toArray() {
                return matches;
              }
            };
          }
        };
      }
      if (name === 'notifications') {
        return notificationsCollection;
      }
    }
  };

  const logPath = '/home/dawit/Documents/Projects/mobile-app/kuli-logistics-platform/sent_emails.log';
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }

  const repo = new MongoNotificationRepository({ db });
  await repo.insertMany([
    {
      id: 'notif_1',
      recipientUserId: 'usr_001',
      title: 'Email Enabled Notification',
      body: 'Body 1',
      channels: ['in_app']
    },
    {
      id: 'notif_2',
      recipientUserId: 'usr_002',
      title: 'Email Disabled Notification',
      body: 'Body 2',
      channels: ['in_app']
    }
  ]);

  const inserted = notificationsCollection.inserted;
  const doc1 = inserted.find(d => d._id === 'notif_1');
  const doc2 = inserted.find(d => d._id === 'notif_2');

  assert.ok(doc1.channels.includes('email'));
  assert.equal(doc1.emailDeliveryStatus, 'sent');

  assert.ok(!doc2.channels.includes('email'));
  assert.equal(doc2.emailDeliveryStatus, undefined);

  assert.ok(fs.existsSync(logPath));
  const logContent = fs.readFileSync(logPath, 'utf8');
  assert.ok(logContent.includes('user1@example.com'));
  assert.ok(logContent.includes('Email Enabled Notification'));
  assert.ok(!logContent.includes('user2@example.com'));

  fs.unlinkSync(logPath);
});

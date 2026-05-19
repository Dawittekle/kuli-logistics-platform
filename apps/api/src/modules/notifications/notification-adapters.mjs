const createDisabledAdapter = (channel) => ({
  channel,
  enabled: false,
  async send(notification) {
    return {
      channel,
      notificationId: notification.id,
      status: 'skipped',
      reason: `${channel}_provider_not_configured`
    };
  }
});

export const createExternalNotificationAdapters = () => ({
  push: createDisabledAdapter('push'),
  sms: createDisabledAdapter('sms'),
  email: createDisabledAdapter('email')
});

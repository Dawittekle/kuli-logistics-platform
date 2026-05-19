import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kuliStatuses,
  offerStatuses,
  roles,
  vehicleAvailabilityStatuses,
  verificationStatuses
} from '../../../../packages/shared/src/index.mjs';
import { AppError } from '../common/errors/app-error.mjs';
import { MarketplaceService } from '../modules/logistics/marketplace-service.mjs';

const client = {
  id: 'usr_client_001',
  role: roles.client
};

const ownerOne = {
  id: 'usr_owner_001',
  role: roles.truckOwner
};

const ownerTwo = {
  id: 'usr_owner_002',
  role: roles.truckOwner
};

const assistant = {
  id: 'usr_assistant_001',
  role: roles.assistant
};

const outsider = {
  id: 'usr_outsider_001',
  role: roles.truckOwner
};

const pickupLocation = {
  point: { type: 'Point', coordinates: [38.7892, 8.9806] },
  addressText: 'Bole, Addis Ababa'
};

const destinationLocation = {
  point: { type: 'Point', coordinates: [38.7525, 9.0341] },
  addressText: 'Piyassa, Addis Ababa'
};

class MemoryKuliRequestRepository {
  constructor() {
    this.records = new Map();
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async findByClientIdAndIdempotencyKey({ clientId, idempotencyKey }) {
    if (!idempotencyKey) {
      return null;
    }

    return (
      Array.from(this.records.values()).find(
        (record) => record.clientId === clientId && record.idempotencyKey === idempotencyKey
      ) ?? null
    );
  }

  async findByHotlineTicketId(hotlineTicketId) {
    if (!hotlineTicketId) {
      return null;
    }

    return Array.from(this.records.values()).find((record) => record.hotlineTicketId === hotlineTicketId) ?? null;
  }

  async listMine({ userId, role }) {
    return Array.from(this.records.values()).filter((record) =>
      role === roles.truckOwner ? record.selectedOwnerId === userId : record.clientId === userId
    );
  }

  async save(record) {
    const saved = {
      ...record,
      createdAt: record.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.records.set(saved.id, saved);
    return saved;
  }

  async acceptPending({ requestId, offerId, ownerId, vehicleId }) {
    const record = this.records.get(requestId);

    if (!record || record.status !== kuliStatuses.pending) {
      return null;
    }

    const accepted = {
      ...record,
      status: kuliStatuses.accepted,
      selectedOwnerId: ownerId,
      selectedVehicleId: vehicleId,
      acceptedOfferId: offerId,
      updatedAt: new Date().toISOString()
    };
    this.records.set(requestId, accepted);

    return accepted;
  }

  async transitionStatus({ requestId, fromStatus, toStatus, update = {} }) {
    const record = this.records.get(requestId);

    if (!record || record.status !== fromStatus) {
      return null;
    }

    const updated = {
      ...record,
      ...update,
      status: toStatus,
      updatedAt: new Date().toISOString()
    };
    this.records.set(requestId, updated);

    return updated;
  }

  async markTimedOutIfPending(requestId) {
    const record = this.records.get(requestId);

    if (!record || record.status !== kuliStatuses.pending) {
      return null;
    }

    const timedOut = {
      ...record,
      status: kuliStatuses.timedOut,
      updatedAt: new Date().toISOString()
    };
    this.records.set(requestId, timedOut);

    return timedOut;
  }

  async cancelPending({ requestId, actorUserId, reason }) {
    const record = this.records.get(requestId);

    if (!record || record.clientId !== actorUserId || record.status !== kuliStatuses.pending) {
      return null;
    }

    const cancelled = {
      ...record,
      status: kuliStatuses.cancelled,
      cancellation: {
        cancelledByUserId: actorUserId,
        reason,
        cancelledAt: new Date().toISOString()
      }
    };
    this.records.set(requestId, cancelled);

    return cancelled;
  }
}

class MemoryTripOfferRepository {
  constructor() {
    this.records = new Map();
  }

  async insertMany(offers) {
    for (const offer of offers) {
      this.records.set(offer.id, {
        ...offer,
        createdAt: offer.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return this.listByRequestId(offers[0].requestId);
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async listByRequestId(requestId) {
    return Array.from(this.records.values()).filter((offer) => offer.requestId === requestId);
  }

  async listByOwnerId(ownerId) {
    return Array.from(this.records.values()).filter(
      (offer) => offer.ownerId === ownerId && [offerStatuses.sent, offerStatuses.viewed].includes(offer.status)
    );
  }

  async markViewed({ offerId, ownerId }) {
    const offer = this.records.get(offerId);

    if (offer?.ownerId === ownerId && offer.status === offerStatuses.sent) {
      const viewed = {
        ...offer,
        status: offerStatuses.viewed,
        viewedAt: new Date().toISOString()
      };
      this.records.set(offerId, viewed);
      return viewed;
    }

    return offer ?? null;
  }

  async markDeclined({ offerId, ownerId, declineReason }) {
    const offer = this.records.get(offerId);

    if (!offer || offer.ownerId !== ownerId || ![offerStatuses.sent, offerStatuses.viewed].includes(offer.status)) {
      return null;
    }

    const declined = {
      ...offer,
      status: offerStatuses.declined,
      declinedAt: new Date().toISOString(),
      declineReason
    };
    this.records.set(offerId, declined);

    return declined;
  }

  async markAccepted({ offerId, ownerId, now }) {
    const offer = this.records.get(offerId);

    if (!offer || offer.ownerId !== ownerId || ![offerStatuses.sent, offerStatuses.viewed].includes(offer.status)) {
      return null;
    }

    if (offer.expiresAt <= now) {
      return null;
    }

    const accepted = {
      ...offer,
      status: offerStatuses.accepted,
      acceptedAt: now
    };
    this.records.set(offerId, accepted);

    return accepted;
  }

  async expireCompeting({ requestId, exceptOfferId }) {
    for (const [id, offer] of this.records.entries()) {
      if (offer.requestId === requestId && id !== exceptOfferId && [offerStatuses.sent, offerStatuses.viewed].includes(offer.status)) {
        this.records.set(id, {
          ...offer,
          status: offerStatuses.expired
        });
      }
    }
  }

  async cancelForRequest(requestId) {
    for (const [id, offer] of this.records.entries()) {
      if (offer.requestId === requestId && [offerStatuses.sent, offerStatuses.viewed].includes(offer.status)) {
        this.records.set(id, {
          ...offer,
          status: offerStatuses.cancelled
        });
      }
    }
  }

  async expireStale(now) {
    const stale = [];

    for (const [id, offer] of this.records.entries()) {
      if ([offerStatuses.sent, offerStatuses.viewed].includes(offer.status) && offer.expiresAt <= now) {
        const expired = {
          ...offer,
          status: offerStatuses.expired
        };
        this.records.set(id, expired);
        stale.push(expired);
      }
    }

    return stale;
  }
}

class MemoryVehicleRepository {
  constructor() {
    this.records = new Map(
      [
        {
          id: 'veh_one',
          ownerId: ownerOne.id,
          verificationStatus: verificationStatuses.approved,
          availabilityStatus: vehicleAvailabilityStatuses.onlineAvailable
        },
        {
          id: 'veh_two',
          ownerId: ownerTwo.id,
          verificationStatus: verificationStatuses.approved,
          availabilityStatus: vehicleAvailabilityStatuses.onlineAvailable
        }
      ].map((vehicle) => [vehicle.id, vehicle])
    );
  }

  async findByIds(ids) {
    return ids.map((id) => this.records.get(id)).filter(Boolean);
  }

  async markBusyIfAvailable({ vehicleId, activeTripId }) {
    const vehicle = this.records.get(vehicleId);

    if (
      !vehicle ||
      vehicle.verificationStatus !== verificationStatuses.approved ||
      vehicle.availabilityStatus !== vehicleAvailabilityStatuses.onlineAvailable
    ) {
      return null;
    }

    const busy = {
      ...vehicle,
      availabilityStatus: vehicleAvailabilityStatuses.busyOnJob,
      activeTripId
    };
    this.records.set(vehicleId, busy);

    return busy;
  }

  async releaseIfActiveTrip({ vehicleId, activeTripId }) {
    const vehicle = this.records.get(vehicleId);

    if (vehicle?.activeTripId === activeTripId) {
      const released = {
        ...vehicle,
        availabilityStatus: vehicleAvailabilityStatuses.onlineAvailable,
        activeTripId: undefined
      };
      this.records.set(vehicleId, released);
      return released;
    }

    return null;
  }
}

class MemoryNotificationRepository {
  constructor() {
    this.records = [];
  }

  async insertMany(notifications) {
    this.records.push(...notifications);
    return notifications;
  }

  async listByRecipientId(recipientUserId) {
    return this.records.filter((notification) => notification.recipientUserId === recipientUserId);
  }

  async markRead({ notificationId, recipientUserId }) {
    const notification = this.records.find((entry) => entry.id === notificationId && entry.recipientUserId === recipientUserId);

    if (!notification) {
      return null;
    }

    notification.deliveryStatus = 'read';
    notification.readAt = new Date().toISOString();
    return notification;
  }
}

class MemoryStatusEventRepository {
  constructor() {
    this.records = [];
  }

  async insert(event) {
    const saved = {
      ...event,
      createdAt: event.createdAt ?? new Date().toISOString()
    };
    this.records.push(saved);
    return saved;
  }

  async listByRequestId(requestId) {
    return this.records.filter((event) => event.requestId === requestId);
  }
}

class MemoryMessageRepository {
  constructor() {
    this.records = [];
  }

  async findBySenderAndClientGeneratedId({ senderId, clientGeneratedId }) {
    if (!clientGeneratedId) {
      return null;
    }

    return (
      this.records.find((message) => message.senderId === senderId && message.clientGeneratedId === clientGeneratedId) ?? null
    );
  }

  async insert(message) {
    const saved = {
      ...message,
      createdAt: message.createdAt ?? new Date().toISOString()
    };
    this.records.push(saved);
    return saved;
  }

  async listByRequestId(requestId) {
    return this.records.filter((message) => message.requestId === requestId);
  }
}

class MemoryPaymentRepository {
  constructor() {
    this.records = new Map();
  }

  async findByRequestId(requestId) {
    return Array.from(this.records.values()).find((payment) => payment.requestId === requestId) ?? null;
  }

  async save(payment) {
    const saved = {
      ...payment,
      createdAt: payment.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.records.set(saved.id, saved);
    return saved;
  }
}

class StubQuoteService {
  async createQuote() {
    return {
      route: {
        etaMinutes: 22
      },
      requestedVehicleClass: {
        id: 'vcls_medium-truck'
      },
      loadDetails: {
        itemType: 'household_move',
        loadingAssistanceRequested: false
      },
      quoteSnapshot: {
        pricingRuleVersion: 1,
        currency: 'ETB',
        baseFare: 1200,
        distanceKm: 8,
        etaMinutes: 22,
        totalEstimate: 2200
      },
      candidates: [
        {
          vehicleId: 'veh_one',
          distanceKm: 2
        },
        {
          vehicleId: 'veh_two',
          distanceKm: 3
        }
      ]
    };
  }
}

const createService = () => {
  const kuliRequestRepository = new MemoryKuliRequestRepository();
  const tripOfferRepository = new MemoryTripOfferRepository();
  const vehicleRepository = new MemoryVehicleRepository();
  const notificationRepository = new MemoryNotificationRepository();
  const statusEventRepository = new MemoryStatusEventRepository();
  const messageRepository = new MemoryMessageRepository();
  const paymentRepository = new MemoryPaymentRepository();
  const service = new MarketplaceService({
    kuliRequestRepository,
    tripOfferRepository,
    vehicleRepository,
    notificationRepository,
    statusEventRepository,
    messageRepository,
    paymentRepository,
    quoteService: new StubQuoteService()
  });

  return {
    service,
    kuliRequestRepository,
    tripOfferRepository,
    vehicleRepository,
    notificationRepository,
    statusEventRepository,
    messageRepository,
    paymentRepository
  };
};

const requestInput = {
  pickupLocation,
  destinationLocation,
  loadDetails: {
    itemType: 'household_move'
  },
  selectedVehicleIds: ['veh_one', 'veh_two']
};

test('create request is idempotent and dispatches offers', async () => {
  const { service, notificationRepository } = createService();

  const first = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-001'
  });
  const second = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-001'
  });

  assert.equal(first.request.status, kuliStatuses.pending);
  assert.equal(first.offers.length, 2);
  assert.equal(first.waitingState.status, 'waiting_for_owner_acceptance');
  assert.equal(second.request.id, first.request.id);
  assert.equal(second.idempotentReplay, true);
  assert.equal(notificationRepository.records.length, 2);
});

test('owner can view and decline an offer', async () => {
  const { service } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-002'
  });
  const offer = created.offers.find((entry) => entry.ownerId === ownerOne.id);

  const viewed = await service.markOfferViewed({
    actor: ownerOne,
    offerId: offer.id
  });
  const declined = await service.declineOffer({
    actor: ownerOne,
    offerId: offer.id,
    input: {
      declineReason: 'Unavailable'
    }
  });

  assert.equal(viewed.status, offerStatuses.viewed);
  assert.equal(declined.status, offerStatuses.declined);
});

test('two simultaneous accepts produce one winner', async () => {
  const { service, vehicleRepository, statusEventRepository } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-003'
  });
  const offerOne = created.offers.find((entry) => entry.ownerId === ownerOne.id);
  const offerTwo = created.offers.find((entry) => entry.ownerId === ownerTwo.id);

  const results = await Promise.allSettled([
    service.acceptOffer({
      actor: ownerOne,
      offerId: offerOne.id
    }),
    service.acceptOffer({
      actor: ownerTwo,
      offerId: offerTwo.id
    })
  ]);

  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.code, 'REQUEST_ALREADY_ACCEPTED');
  assert.equal(fulfilled[0].value.request.status, kuliStatuses.accepted);
  assert.equal(statusEventRepository.records.filter((event) => event.toStatus === kuliStatuses.accepted).length, 1);

  const releasedLosingVehicle = Array.from(vehicleRepository.records.values()).find(
    (vehicle) => vehicle.ownerId !== fulfilled[0].value.request.selectedOwnerId
  );
  assert.equal(releasedLosingVehicle.availabilityStatus, vehicleAvailabilityStatuses.onlineAvailable);
});

test('timeout job expires stale offers and pending request', async () => {
  const { service, tripOfferRepository } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-004'
  });

  for (const [id, offer] of tripOfferRepository.records.entries()) {
    tripOfferRepository.records.set(id, {
      ...offer,
      expiresAt: '2026-01-01T00:00:00.000Z'
    });
  }

  const result = await service.expireTimedOutOffers({
    now: '2026-01-01T00:10:00.000Z'
  });

  assert.equal(result.expiredOfferCount, 2);
  assert.equal(result.timedOutRequests[0].id, created.request.id);
  assert.equal(result.timedOutRequests[0].status, kuliStatuses.timedOut);
});

test('client cancellation cancels pending offers and notifies owners', async () => {
  const { service, notificationRepository, statusEventRepository } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-006'
  });

  const cancelled = await service.cancelRequest({
    actor: client,
    requestId: created.request.id,
    input: {
      reason: 'Found another truck'
    }
  });

  assert.equal(cancelled.request.status, kuliStatuses.cancelled);
  assert.ok(cancelled.offers.every((offer) => offer.status === offerStatuses.cancelled));
  assert.equal(notificationRepository.records.filter((entry) => entry.type === 'request.cancelled').length, 2);
  assert.equal(statusEventRepository.records.at(-1).toStatus, kuliStatuses.cancelled);
});

test('accepting an expired offer fails with conflict', async () => {
  const { service, tripOfferRepository } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-005'
  });
  const offer = created.offers.find((entry) => entry.ownerId === ownerOne.id);
  tripOfferRepository.records.set(offer.id, {
    ...offer,
    expiresAt: '2026-01-01T00:00:00.000Z'
  });

  await assert.rejects(
    () =>
      service.acceptOffer({
        actor: ownerOne,
        offerId: offer.id
      }),
    (error) => error instanceof AppError && error.code === 'OFFER_NOT_AVAILABLE'
  );
});

test('assigned owner can execute trip lifecycle and every transition creates an event', async () => {
  const { service, vehicleRepository, paymentRepository } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-007'
  });
  const offer = created.offers.find((entry) => entry.ownerId === ownerOne.id);
  const accepted = await service.acceptOffer({
    actor: ownerOne,
    offerId: offer.id
  });

  const statuses = [
    kuliStatuses.enRouteToPickup,
    kuliStatuses.arrivedAtPickup,
    kuliStatuses.loading,
    kuliStatuses.inTransit,
    kuliStatuses.unloading,
    kuliStatuses.completed
  ];

  let current = accepted.request;

  for (const status of statuses) {
    const result = await service.transitionRequestStatus({
      actor: ownerOne,
      requestId: current.id,
      input: { status }
    });
    current = result.request;
  }

  const events = await service.listStatusEvents({
    actor: client,
    requestId: current.id
  });
  const releasedVehicle = vehicleRepository.records.get(accepted.request.selectedVehicleId);
  const payment = await paymentRepository.findByRequestId(current.id);

  assert.equal(current.status, kuliStatuses.completed);
  assert.equal(events.length, 7);
  assert.deepEqual(events.map((event) => event.toStatus), [kuliStatuses.accepted, ...statuses]);
  assert.equal(releasedVehicle.availabilityStatus, vehicleAvailabilityStatuses.onlineAvailable);
  assert.equal(payment.status, 'pending');
  assert.equal(payment.amountExpected, 2200);
});

test('invalid and unauthorized status transitions are blocked', async () => {
  const { service } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-008'
  });
  const offer = created.offers.find((entry) => entry.ownerId === ownerOne.id);
  const accepted = await service.acceptOffer({
    actor: ownerOne,
    offerId: offer.id
  });

  await assert.rejects(
    () =>
      service.transitionRequestStatus({
        actor: ownerOne,
        requestId: accepted.request.id,
        input: { status: kuliStatuses.completed }
      }),
    (error) => error instanceof AppError && error.code === 'INVALID_STATUS_TRANSITION'
  );

  await assert.rejects(
    () =>
      service.transitionRequestStatus({
        actor: client,
        requestId: accepted.request.id,
        input: { status: kuliStatuses.enRouteToPickup }
      }),
    (error) => error instanceof AppError && error.code === 'STATUS_UPDATE_FORBIDDEN'
  );
});

test('request-scoped messages are idempotent and limited to participants', async () => {
  const { service, notificationRepository } = createService();
  const created = await service.createRequest({
    actor: client,
    input: requestInput,
    idempotencyKey: 'idem-009'
  });
  const offer = created.offers.find((entry) => entry.ownerId === ownerOne.id);
  const accepted = await service.acceptOffer({
    actor: ownerOne,
    offerId: offer.id
  });

  const first = await service.sendMessage({
    actor: client,
    requestId: accepted.request.id,
    input: {
      body: 'I am waiting near the gate.',
      clientGeneratedId: 'mobile-msg-001'
    }
  });
  const second = await service.sendMessage({
    actor: client,
    requestId: accepted.request.id,
    input: {
      body: 'I am waiting near the gate.',
      clientGeneratedId: 'mobile-msg-001'
    }
  });
  const messages = await service.listMessages({
    actor: ownerOne,
    requestId: accepted.request.id
  });

  assert.equal(first.message.id, second.message.id);
  assert.equal(second.idempotentReplay, true);
  assert.equal(messages.length, 1);
  assert.equal(notificationRepository.records.filter((entry) => entry.type === 'message.created').length, 1);

  await assert.rejects(
    () =>
      service.sendMessage({
        actor: outsider,
        requestId: accepted.request.id,
        input: {
          body: 'Can I see this?'
        }
      }),
    (error) => error instanceof AppError && error.code === 'KULI_REQUEST_NOT_FOUND'
  );
});

test('assistant can create assisted request with ticket linkage', async () => {
  const { service } = createService();

  const created = await service.createAssistedRequest({
    actor: assistant,
    input: {
      ...requestInput,
      hotlineTicketId: 'ticket_001',
      clientContactSnapshot: {
        phone: '+251911111111'
      }
    },
    idempotencyKey: 'assistant-booking-001'
  });
  const replay = await service.createAssistedRequest({
    actor: assistant,
    input: {
      ...requestInput,
      hotlineTicketId: 'ticket_001',
      clientContactSnapshot: {
        phone: '+251911111111'
      }
    },
    idempotencyKey: 'assistant-booking-001'
  });

  assert.equal(created.request.status, kuliStatuses.pending);
  assert.equal(created.request.createdByAssistantId, assistant.id);
  assert.equal(created.request.hotlineTicketId, 'ticket_001');
  assert.equal(created.request.clientContactSnapshot.phone, '+251911111111');
  assert.equal(created.offers.length, 2);
  assert.equal(replay.request.id, created.request.id);
  assert.equal(replay.idempotentReplay, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { roles, ticketSources, ticketStatuses } from '../../../../packages/shared/src/index.mjs';
import { AppError } from '../common/errors/app-error.mjs';
import { SupportService } from '../modules/support/support-service.mjs';

const assistant = {
  id: 'usr_assistant_001',
  role: roles.assistant
};

const otherAssistant = {
  id: 'usr_assistant_002',
  role: roles.assistant
};

const admin = {
  id: 'usr_admin_001',
  role: roles.admin
};

class MemoryHotlineTicketRepository {
  constructor() {
    this.records = new Map();
  }

  async save(ticket) {
    const saved = {
      ...ticket,
      createdAt: ticket.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.records.set(saved.id, saved);
    return saved;
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async list(filters = {}) {
    return Array.from(this.records.values()).filter((ticket) =>
      Object.entries(filters)
        .filter(([, value]) => value)
        .every(([key, value]) => ticket[key] === value)
    );
  }

  async transition({ ticketId, fromStatus, toStatus, update = {} }) {
    const ticket = this.records.get(ticketId);

    if (!ticket || ticket.status !== fromStatus) {
      return null;
    }

    const transitioned = {
      ...ticket,
      ...update,
      status: toStatus,
      updatedAt: new Date().toISOString()
    };
    this.records.set(ticketId, transitioned);
    return transitioned;
  }

  async linkRequest({ ticketId, requestId }) {
    const ticket = this.records.get(ticketId);

    if (!ticket || [ticketStatuses.closed, ticketStatuses.cancelled].includes(ticket.status)) {
      return null;
    }

    const linked = {
      ...ticket,
      requestId
    };
    this.records.set(ticketId, linked);
    return linked;
  }

  async expirePendingClient(now) {
    const expired = [];

    for (const [id, ticket] of this.records.entries()) {
      if (ticket.status === ticketStatuses.pendingClient && ticket.followUpAt <= now) {
        const cancelled = {
          ...ticket,
          status: ticketStatuses.cancelled,
          cancellationReason: 'no_response_timeout',
          closedAt: now
        };
        this.records.set(id, cancelled);
        expired.push(cancelled);
      }
    }

    return expired;
  }
}

class MemoryUserRepository {
  async findClientsByPhone(phone) {
    return phone === '+251911111111'
      ? [
          {
            id: 'usr_client_001',
            role: roles.client,
            phone
          }
        ]
      : [];
  }
}

class MemoryNotificationIntentRepository {
  constructor() {
    this.records = [];
  }

  async insert(intent) {
    const saved = {
      ...intent,
      status: intent.status ?? 'pending',
      createdAt: intent.createdAt ?? new Date().toISOString()
    };
    this.records.push(saved);
    return saved;
  }
}

class StubMarketplaceService {
  constructor() {
    this.requests = [];
  }

  async createAssistedRequest({ actor, input, idempotencyKey }) {
    const request = {
      id: 'kreq_assisted_001',
      requestCode: 'KULI-ASSISTED-001',
      status: 'pending',
      createdByAssistantId: actor.id,
      hotlineTicketId: input.hotlineTicketId,
      clientContactSnapshot: input.clientContactSnapshot,
      idempotencyKey
    };
    this.requests.push(request);

    return {
      request,
      offers: [
        {
          id: 'offer_001',
          requestId: request.id
        }
      ]
    };
  }
}

const createService = () => {
  const hotlineTicketRepository = new MemoryHotlineTicketRepository();
  const notificationIntentRepository = new MemoryNotificationIntentRepository();
  const marketplaceService = new StubMarketplaceService();
  const service = new SupportService({
    hotlineTicketRepository,
    userRepository: new MemoryUserRepository(),
    marketplaceService,
    notificationIntentRepository
  });

  return {
    service,
    hotlineTicketRepository,
    notificationIntentRepository,
    marketplaceService
  };
};

test('assistant ticket transitions are enforced and closed tickets cannot be edited', async () => {
  const { service } = createService();
  const ticket = await service.createTicket({
    actor: assistant,
    input: {
      source: ticketSources.missedCall,
      callerPhone: '+251911111111',
      callSummary: 'Client missed the hotline.'
    }
  });

  await assert.rejects(
    () =>
      service.transitionTicket({
        actor: assistant,
        ticketId: ticket.id,
        input: {
          status: ticketStatuses.closed
        }
      }),
    (error) => error instanceof AppError && error.code === 'INVALID_TICKET_TRANSITION'
  );

  const assigned = await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.assigned
    }
  });
  const inProgress = await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.inProgress,
      callSummary: 'Assistant reached the caller.'
    }
  });
  const closed = await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.closed
    }
  });

  assert.equal(assigned.assignedAssistantId, assistant.id);
  assert.equal(inProgress.callSummary, 'Assistant reached the caller.');
  assert.equal(closed.status, ticketStatuses.closed);

  await assert.rejects(
    () =>
      service.transitionTicket({
        actor: assistant,
        ticketId: ticket.id,
        input: {
          status: ticketStatuses.cancelled
        }
      }),
    (error) => error instanceof AppError && error.code === 'TICKET_CLOSED'
  );
});

test('assigned ticket cannot be edited by another assistant', async () => {
  const { service } = createService();
  const ticket = await service.createTicket({
    actor: assistant,
    input: {
      source: ticketSources.incomingCall,
      callerPhone: '+251922222222'
    }
  });

  await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.assigned
    }
  });

  await assert.rejects(
    () =>
      service.transitionTicket({
        actor: otherAssistant,
        ticketId: ticket.id,
        input: {
          status: ticketStatuses.inProgress
        }
      }),
    (error) => error instanceof AppError && error.code === 'TICKET_ASSIGNED_TO_ANOTHER_ASSISTANT'
  );
});

test('assistant can create assisted booking and SMS confirmation intent', async () => {
  const { service, notificationIntentRepository } = createService();
  const ticket = await service.createTicket({
    actor: assistant,
    input: {
      source: ticketSources.manual,
      callerPhone: '+251911111111'
    }
  });
  await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.assigned
    }
  });

  const booking = await service.createAssistedBooking({
    actor: assistant,
    input: {
      ticketId: ticket.id,
      selectedVehicleIds: ['veh_001'],
      pickupLocation: {
        addressText: 'Bole',
        point: { type: 'Point', coordinates: [38.7892, 8.9806] }
      },
      destinationLocation: {
        addressText: 'Piyassa',
        point: { type: 'Point', coordinates: [38.7525, 9.0341] }
      },
      loadDetails: {
        itemType: 'household_move'
      }
    },
    idempotencyKey: 'assist-001'
  });

  assert.equal(booking.request.createdByAssistantId, assistant.id);
  assert.equal(booking.ticket.requestId, booking.request.id);
  assert.equal(booking.confirmationIntent.channel, 'sms');
  assert.equal(booking.confirmationIntent.targetPhone, '+251911111111');
  assert.equal(notificationIntentRepository.records.length, 1);
});

test('assistant can look up client profile by phone', async () => {
  const { service } = createService();
  const results = await service.searchClients({
    actor: assistant,
    phone: '+251911111111'
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].role, roles.client);
});

test('pending-client timeout job cancels stale tickets', async () => {
  const { service } = createService();
  const ticket = await service.createTicket({
    actor: assistant,
    input: {
      source: ticketSources.missedCall,
      callerPhone: '+251933333333'
    }
  });
  await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.assigned
    }
  });
  await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.inProgress
    }
  });
  await service.transitionTicket({
    actor: assistant,
    ticketId: ticket.id,
    input: {
      status: ticketStatuses.pendingClient,
      followUpAt: '2026-01-01T00:00:00.000Z'
    }
  });

  const result = await service.expirePendingClientTickets({
    actor: admin,
    now: '2026-01-01T00:30:00.000Z'
  });

  assert.equal(result.expiredTicketCount, 1);
  assert.equal(result.expiredTickets[0].status, ticketStatuses.cancelled);
  assert.equal(result.expiredTickets[0].cancellationReason, 'no_response_timeout');
});

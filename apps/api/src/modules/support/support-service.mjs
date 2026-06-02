import { roles, ticketSources, ticketStatuses } from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const ticketCode = () => `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const ticketTransitions = {
  [ticketStatuses.open]: [ticketStatuses.assigned, ticketStatuses.cancelled],
  [ticketStatuses.assigned]: [ticketStatuses.inProgress, ticketStatuses.cancelled],
  [ticketStatuses.inProgress]: [ticketStatuses.pendingClient, ticketStatuses.closed, ticketStatuses.cancelled],
  [ticketStatuses.pendingClient]: [ticketStatuses.inProgress, ticketStatuses.closed, ticketStatuses.cancelled],
  [ticketStatuses.closed]: [],
  [ticketStatuses.cancelled]: []
};

const assertAssistantOrAdmin = (actor) => {
  if (![roles.assistant, roles.admin].includes(actor.role)) {
    throw new AppError(403, 'ASSISTANT_REQUIRED', 'Only assistants or admins can manage hotline tickets.');
  }
};

const assertEditableTicket = (ticket) => {
  if ([ticketStatuses.closed, ticketStatuses.cancelled].includes(ticket.status)) {
    throw new AppError(409, 'TICKET_CLOSED', 'Closed or cancelled tickets cannot be edited.');
  }
};

/**
 * Service managing customer support hotline tickets and dispatcher-assisted bookings.
 * Designed to support phone-based booking queries for clients without smartphones/internet access.
 */
export class SupportService {
  constructor({
    hotlineTicketRepository,
    userRepository,
    marketplaceService,
    notificationIntentRepository
  }) {
    this.hotlineTicketRepository = hotlineTicketRepository;
    this.userRepository = userRepository;
    this.marketplaceService = marketplaceService;
    this.notificationIntentRepository = notificationIntentRepository;
  }

  async listTickets({ actor, filters = {} }) {
    assertAssistantOrAdmin(actor);
    return this.hotlineTicketRepository.list(filters);
  }

  async getTicket({ actor, ticketId }) {
    assertAssistantOrAdmin(actor);
    const ticket = await this.hotlineTicketRepository.findById(ticketId);

    if (!ticket) {
      throw new AppError(404, 'HOTLINE_TICKET_NOT_FOUND', 'Hotline ticket was not found.');
    }

    return ticket;
  }

  /**
   * Logs a new hotline call, generating a unique ticket code.
   * Enables capturing booking specs directly from phone conversation scripts.
   */
  async createTicket({ actor, input }) {
    assertAssistantOrAdmin(actor);

    if (!Object.values(ticketSources).includes(input.source)) {
      throw new AppError(422, 'INVALID_TICKET_SOURCE', 'Unknown hotline ticket source.');
    }

    return this.hotlineTicketRepository.save({
      id: createId('ticket'),
      ticketCode: ticketCode(),
      status: ticketStatuses.open,
      callerPhone: input.callerPhone,
      clientId: input.clientId,
      source: input.source,
      callSummary: input.callSummary,
      followUpAt: input.followUpAt,
      createdByAssistantId: actor.id
    });
  }

  /**
   * Transitions a ticket's status through its finite lifecycle.
   * Enforces claiming restrictions so assistants do not accidentally modify another assistant's claimed ticket.
   */
  async transitionTicket({ actor, ticketId, input }) {
    assertAssistantOrAdmin(actor);
    const ticket = await this.getTicket({ actor, ticketId });
    assertEditableTicket(ticket);

    const nextStatus = input.status;

    if (!Object.values(ticketStatuses).includes(nextStatus)) {
      throw new AppError(422, 'INVALID_TICKET_STATUS', 'Unknown hotline ticket status.');
    }

    const allowed = ticketTransitions[ticket.status] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new AppError(409, 'INVALID_TICKET_TRANSITION', 'This ticket cannot move between those statuses.', {
        fromStatus: ticket.status,
        toStatus: nextStatus
      });
    }

    if (ticket.assignedAssistantId && ticket.assignedAssistantId !== actor.id && actor.role !== roles.admin) {
      throw new AppError(403, 'TICKET_ASSIGNED_TO_ANOTHER_ASSISTANT', 'This ticket is assigned to another assistant.');
    }

    const update = {
      callSummary: input.callSummary ?? ticket.callSummary,
      followUpAt: input.followUpAt ?? ticket.followUpAt
    };

    if (nextStatus === ticketStatuses.assigned && !ticket.assignedAssistantId) {
      update.assignedAssistantId = actor.id;
    }

    if (nextStatus === ticketStatuses.cancelled) {
      update.cancellationReason = input.cancellationReason ?? 'cancelled_by_staff';
      update.closedAt = new Date().toISOString();
    }

    if (nextStatus === ticketStatuses.closed) {
      update.closedAt = new Date().toISOString();
    }

    const transitioned = await this.hotlineTicketRepository.transition({
      ticketId,
      fromStatus: ticket.status,
      toStatus: nextStatus,
      update
    });

    if (!transitioned) {
      throw new AppError(409, 'INVALID_TICKET_TRANSITION', 'This ticket changed before the command completed.');
    }

    return transitioned;
  }

  async searchClients({ actor, phone, query }) {
    assertAssistantOrAdmin(actor);

    const search = query ?? phone;

    if (!search) {
      return [];
    }

    if (this.userRepository.searchClients) {
      return this.userRepository.searchClients(search);
    }

    return this.userRepository.findClientsByPhone(search);
  }

  /**
   * Delegates and spawns a confirmed logistics booking from an active support ticket.
   * Sends confirmation SMS notification intents to the customer's phone.
   */
  async createAssistedBooking({ actor, input, idempotencyKey }) {
    assertAssistantOrAdmin(actor);
    const ticket = await this.getTicket({
      actor,
      ticketId: input.ticketId
    });
    assertEditableTicket(ticket);

    if (![ticketStatuses.assigned, ticketStatuses.inProgress, ticketStatuses.pendingClient].includes(ticket.status)) {
      throw new AppError(409, 'TICKET_NOT_READY_FOR_BOOKING', 'Ticket must be assigned or in progress before booking.');
    }

    if (ticket.assignedAssistantId && ticket.assignedAssistantId !== actor.id && actor.role !== roles.admin) {
      throw new AppError(403, 'TICKET_ASSIGNED_TO_ANOTHER_ASSISTANT', 'This ticket is assigned to another assistant.');
    }

    const result = await this.marketplaceService.createAssistedRequest({
      actor,
      input: {
        ...input,
        clientId: input.clientId ?? ticket.clientId,
        clientContactSnapshot: input.clientContactSnapshot ?? {
          phone: ticket.callerPhone
        },
        hotlineTicketId: ticket.id
      },
      idempotencyKey
    });

    const linkedTicket = await this.hotlineTicketRepository.linkRequest({
      ticketId: ticket.id,
      requestId: result.request.id
    });

    const confirmationIntent = await this.notificationIntentRepository.insert({
      id: createId('notif_intent'),
      type: 'assisted_booking.confirmation',
      channel: 'sms',
      targetPhone: input.clientContactSnapshot?.phone ?? ticket.callerPhone,
      ticketId: ticket.id,
      requestId: result.request.id,
      payload: {
        requestCode: result.request.requestCode,
        status: result.request.status
      }
    });

    return {
      ...result,
      ticket: linkedTicket,
      confirmationIntent
    };
  }

  async expirePendingClientTickets({ actor, now = new Date().toISOString() } = {}) {
    if (actor.role !== roles.admin) {
      throw new AppError(403, 'ADMIN_REQUIRED', 'Only admins can run pending-client ticket cleanup.');
    }

    const expiredTickets = await this.hotlineTicketRepository.expirePendingClient(now);

    return {
      expiredTicketCount: expiredTickets.length,
      expiredTickets
    };
  }
}

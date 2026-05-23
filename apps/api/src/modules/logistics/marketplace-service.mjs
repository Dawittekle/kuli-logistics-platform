import {
  kuliStatuses,
  offerStatuses,
  paymentFlows,
  paymentMethods,
  paymentStatuses,
  roles,
  vehicleAvailabilityStatuses,
  verificationStatuses
} from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const offerExpiryMinutes = 10;
const terminalRequestStatuses = [kuliStatuses.cancelled, kuliStatuses.timedOut];

const statusTransitions = {
  [kuliStatuses.pending]: [kuliStatuses.cancelled, kuliStatuses.timedOut],
  [kuliStatuses.accepted]: [kuliStatuses.enRouteToPickup, kuliStatuses.cancelled],
  [kuliStatuses.enRouteToPickup]: [kuliStatuses.arrivedAtPickup, kuliStatuses.cancelled],
  [kuliStatuses.arrivedAtPickup]: [kuliStatuses.loading, kuliStatuses.cancelled],
  [kuliStatuses.loading]: [kuliStatuses.inTransit, kuliStatuses.cancelled],
  [kuliStatuses.inTransit]: [kuliStatuses.unloading, kuliStatuses.cancelled],
  [kuliStatuses.unloading]: [kuliStatuses.completed, kuliStatuses.cancelled],
  [kuliStatuses.completed]: [],
  [kuliStatuses.cancelled]: [],
  [kuliStatuses.timedOut]: []
};

const requestCode = () => `KULI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const assertClient = (user) => {
  if (user.role !== roles.client) {
    throw new AppError(403, 'CLIENT_REQUIRED', 'Only clients can create KULI requests in this flow.');
  }
};

const assertTruckOwner = (user) => {
  if (user.role !== roles.truckOwner) {
    throw new AppError(403, 'TRUCK_OWNER_REQUIRED', 'Only truck owners can respond to offers.');
  }
};

const assertAssistantOrAdmin = (user) => {
  if (![roles.assistant, roles.admin].includes(user.role)) {
    throw new AppError(403, 'ASSISTANT_REQUIRED', 'Only assistants or admins can create assisted requests.');
  }
};

const isStaff = (user) => [roles.admin, roles.assistant].includes(user.role);

const isRequestParticipant = (user, request) =>
  request.clientId === user.id || request.selectedOwnerId === user.id || isStaff(user);

const createNotification = ({ recipientUserId, type, title, body, data }) => ({
  id: createId('notif'),
  recipientUserId,
  type,
  title,
  body,
  data,
  channels: ['in_app'],
  deliveryStatus: 'pending'
});

export class MarketplaceService {
  constructor({
    kuliRequestRepository,
    tripOfferRepository,
    vehicleRepository,
    notificationRepository,
    statusEventRepository,
    messageRepository,
    paymentRepository,
    quoteService
  }) {
    this.kuliRequestRepository = kuliRequestRepository;
    this.tripOfferRepository = tripOfferRepository;
    this.vehicleRepository = vehicleRepository;
    this.notificationRepository = notificationRepository;
    this.statusEventRepository = statusEventRepository;
    this.messageRepository = messageRepository;
    this.paymentRepository = paymentRepository;
    this.quoteService = quoteService;
  }

  async recordStatusEvent({ request, fromStatus, toStatus, actor, reason }) {
    return this.statusEventRepository.insert({
      id: createId('ksev'),
      requestId: request.id,
      fromStatus,
      toStatus,
      actorUserId: actor?.id ?? 'system',
      actorRole: actor?.role ?? 'system',
      reason
    });
  }

  async ensureCompletedTripPaymentRecord(request) {
    if (!this.paymentRepository || request.status !== kuliStatuses.completed || !request.selectedOwnerId) {
      return null;
    }

    const existing = await this.paymentRepository.findByRequestId(request.id);

    if (existing) {
      return existing;
    }

    return this.paymentRepository.save({
      id: createId('pay'),
      requestId: request.id,
      payerClientId: request.clientId,
      payeeOwnerId: request.selectedOwnerId,
      status: paymentStatuses.pending,
      flow: paymentFlows.payOnDelivery,
      method: paymentMethods.cash,
      currency: request.quoteSnapshot?.currency ?? 'ETB',
      amountExpected: request.quoteSnapshot?.totalEstimate ?? 0,
      platformCommissionAmount: 0
    });
  }

  async createRequest({ actor, input, idempotencyKey }) {
    assertClient(actor);

    const effectiveIdempotencyKey = idempotencyKey ?? input.idempotencyKey;
    const existing = await this.kuliRequestRepository.findByClientIdAndIdempotencyKey({
      clientId: actor.id,
      idempotencyKey: effectiveIdempotencyKey
    });

    if (existing) {
      return {
        request: existing,
        offers: await this.tripOfferRepository.listByRequestId(existing.id),
        idempotentReplay: true
      };
    }

    const quote = await this.quoteService.createQuote({
      actor,
      input
    });
    const selectedVehicleIds = input.selectedVehicleIds?.length
      ? input.selectedVehicleIds
      : quote.candidates.map((candidate) => candidate.vehicleId).slice(0, 3);

    if (selectedVehicleIds.length === 0) {
      throw new AppError(422, 'NO_SELECTED_VEHICLES', 'Select at least one candidate vehicle before sending a request.');
    }

    const vehicles = await this.vehicleRepository.findByIds(selectedVehicleIds);
    const eligibleVehicles = vehicles.filter(
      (vehicle) =>
        vehicle.verificationStatus === verificationStatuses.approved &&
        vehicle.availabilityStatus === vehicleAvailabilityStatuses.onlineAvailable
    );

    if (eligibleVehicles.length === 0) {
      throw new AppError(422, 'NO_ELIGIBLE_SELECTED_VEHICLES', 'Selected vehicles are no longer available.');
    }

    const request = await this.kuliRequestRepository.save({
      id: createId('kreq'),
      requestCode: requestCode(),
      clientId: actor.id,
      status: kuliStatuses.pending,
      pickupLocation: input.pickupLocation,
      destinationLocation: input.destinationLocation,
      requestedPickupTime: input.requestedPickupTime,
      loadDetails: quote.loadDetails,
      requestedVehicleClassId: quote.requestedVehicleClass.id,
      quoteSnapshot: quote.quoteSnapshot,
      idempotencyKey: effectiveIdempotencyKey
    });

    const expiresAt = new Date(Date.now() + offerExpiryMinutes * 60 * 1000).toISOString();
    const offers = await this.tripOfferRepository.insertMany(
      eligibleVehicles.map((vehicle) => ({
        id: createId('offer'),
        requestId: request.id,
        ownerId: vehicle.ownerId,
        vehicleId: vehicle.id,
        status: offerStatuses.sent,
        distanceKmAtOffer: quote.candidates.find((candidate) => candidate.vehicleId === vehicle.id)?.distanceKm,
        etaMinutesAtOffer: quote.route.etaMinutes,
        expiresAt
      }))
    );

    await this.notificationRepository.insertMany(
      offers.map((offer) =>
        createNotification({
          recipientUserId: offer.ownerId,
          type: 'offer.sent',
          title: 'New KULI request',
          body: 'A client selected your vehicle for a pending KULI request.',
          data: {
            requestId: request.id,
            offerId: offer.id
          }
        })
      )
    );

    return {
      request,
      offers,
      waitingState: {
        status: 'waiting_for_owner_acceptance',
        offerCount: offers.length,
        expiresAt
      }
    };
  }

  async createAssistedRequest({ actor, input, idempotencyKey }) {
    assertAssistantOrAdmin(actor);

    const existing = await this.kuliRequestRepository.findByHotlineTicketId(input.hotlineTicketId);

    if (existing) {
      return {
        request: existing,
        offers: await this.tripOfferRepository.listByRequestId(existing.id),
        idempotentReplay: true
      };
    }

    const quote = await this.quoteService.createQuote({
      actor,
      input
    });
    const selectedVehicleIds = input.selectedVehicleIds?.length
      ? input.selectedVehicleIds
      : quote.candidates.map((candidate) => candidate.vehicleId).slice(0, 3);

    if (selectedVehicleIds.length === 0) {
      throw new AppError(422, 'NO_SELECTED_VEHICLES', 'Select at least one candidate vehicle before sending a request.');
    }

    const vehicles = await this.vehicleRepository.findByIds(selectedVehicleIds);
    const eligibleVehicles = vehicles.filter(
      (vehicle) =>
        vehicle.verificationStatus === verificationStatuses.approved &&
        vehicle.availabilityStatus === vehicleAvailabilityStatuses.onlineAvailable
    );

    if (eligibleVehicles.length === 0) {
      throw new AppError(422, 'NO_ELIGIBLE_SELECTED_VEHICLES', 'Selected vehicles are no longer available.');
    }

    const request = await this.kuliRequestRepository.save({
      id: createId('kreq'),
      requestCode: requestCode(),
      clientId: input.clientId,
      clientContactSnapshot: input.clientContactSnapshot,
      createdByAssistantId: actor.id,
      hotlineTicketId: input.hotlineTicketId,
      status: kuliStatuses.pending,
      pickupLocation: input.pickupLocation,
      destinationLocation: input.destinationLocation,
      requestedPickupTime: input.requestedPickupTime,
      loadDetails: quote.loadDetails,
      requestedVehicleClassId: quote.requestedVehicleClass.id,
      quoteSnapshot: quote.quoteSnapshot,
      idempotencyKey
    });

    const expiresAt = new Date(Date.now() + offerExpiryMinutes * 60 * 1000).toISOString();
    const offers = await this.tripOfferRepository.insertMany(
      eligibleVehicles.map((vehicle) => ({
        id: createId('offer'),
        requestId: request.id,
        ownerId: vehicle.ownerId,
        vehicleId: vehicle.id,
        status: offerStatuses.sent,
        distanceKmAtOffer: quote.candidates.find((candidate) => candidate.vehicleId === vehicle.id)?.distanceKm,
        etaMinutesAtOffer: quote.route.etaMinutes,
        expiresAt
      }))
    );

    await this.notificationRepository.insertMany(
      offers.map((offer) =>
        createNotification({
          recipientUserId: offer.ownerId,
          type: 'offer.sent',
          title: 'Assisted KULI request',
          body: 'A hotline assistant selected your vehicle for a pending KULI request.',
          data: {
            requestId: request.id,
            offerId: offer.id,
            hotlineTicketId: input.hotlineTicketId
          }
        })
      )
    );

    return {
      request,
      offers,
      waitingState: {
        status: 'waiting_for_owner_acceptance',
        offerCount: offers.length,
        expiresAt
      }
    };
  }

  async listMine({ actor }) {
    return this.kuliRequestRepository.listMine({
      userId: actor.id,
      role: actor.role
    });
  }

  async getRequest({ actor, requestId }) {
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    const isParticipant = request.clientId === actor.id || request.selectedOwnerId === actor.id || actor.role === roles.admin;

    if (!isParticipant) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    return {
      ...request,
      offers: await this.tripOfferRepository.listByRequestId(request.id)
    };
  }

  async cancelRequest({ actor, requestId, input }) {
    if (actor.role !== roles.client) {
      throw new AppError(403, 'CLIENT_REQUIRED', 'Only clients can cancel their pending KULI requests in this flow.');
    }

    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request || request.clientId !== actor.id) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    const clientCancellableStatuses = [
      kuliStatuses.pending,
      kuliStatuses.accepted,
      kuliStatuses.enRouteToPickup
    ];

    if (!clientCancellableStatuses.includes(request.status)) {
      throw new AppError(409, 'REQUEST_CANNOT_BE_CANCELLED', 'This request cannot be cancelled.');
    }

    const cancelledRequest = await this.kuliRequestRepository.transitionStatus({
      requestId,
      fromStatus: request.status,
      toStatus: kuliStatuses.cancelled,
      update: {
        cancellation: {
          cancelledByUserId: actor.id,
          reason: input.reason ?? 'client_cancelled',
          cancelledAt: new Date().toISOString()
        }
      }
    });

    if (!cancelledRequest) {
      throw new AppError(409, 'REQUEST_CANNOT_BE_CANCELLED', 'This request cannot be cancelled.');
    }

    await this.tripOfferRepository.cancelForRequest(requestId);

    if (cancelledRequest.selectedVehicleId) {
      await this.vehicleRepository.releaseIfActiveTrip({
        vehicleId: cancelledRequest.selectedVehicleId,
        activeTripId: cancelledRequest.id
      });
    }

    await this.recordStatusEvent({
      request: cancelledRequest,
      fromStatus: request.status,
      toStatus: kuliStatuses.cancelled,
      actor,
      reason: input.reason ?? 'client_cancelled'
    });

    const offers = await this.tripOfferRepository.listByRequestId(requestId);
    await this.notificationRepository.insertMany(
      offers.map((offer) =>
        createNotification({
          recipientUserId: offer.ownerId,
          type: 'request.cancelled',
          title: 'KULI request cancelled',
          body: 'A pending KULI request was cancelled by the client.',
          data: {
            requestId,
            offerId: offer.id
          }
        })
      )
    );

    return {
      request: cancelledRequest,
      offers
    };
  }

  async listOwnerOffers({ actor }) {
    assertTruckOwner(actor);
    const offers = await this.tripOfferRepository.listByOwnerId(actor.id);

    return Promise.all(
      offers.map(async (offer) => ({
        ...offer,
        request: await this.kuliRequestRepository.findById(offer.requestId)
      }))
    );
  }

  async markOfferViewed({ actor, offerId }) {
    assertTruckOwner(actor);
    return this.tripOfferRepository.markViewed({
      ownerId: actor.id,
      offerId
    });
  }

  async declineOffer({ actor, offerId, input }) {
    assertTruckOwner(actor);
    return this.tripOfferRepository.markDeclined({
      ownerId: actor.id,
      offerId,
      declineReason: input.declineReason
    });
  }

  async acceptOffer({ actor, offerId, idempotencyKey }) {
    assertTruckOwner(actor);

    const now = new Date().toISOString();
    const offer = await this.tripOfferRepository.findById(offerId);

    if (!offer || offer.ownerId !== actor.id) {
      throw new AppError(404, 'OFFER_NOT_FOUND', 'Offer was not found.');
    }

    if (offer.status === offerStatuses.accepted) {
      const request = await this.kuliRequestRepository.findById(offer.requestId);

      if (request?.acceptedOfferId === offer.id) {
        return {
          request,
          offer,
          idempotentReplay: Boolean(idempotencyKey)
        };
      }
    }

    if (![offerStatuses.sent, offerStatuses.viewed].includes(offer.status) || offer.expiresAt <= now) {
      throw new AppError(409, 'OFFER_NOT_AVAILABLE', 'This offer is no longer available.');
    }

    const busyVehicle = await this.vehicleRepository.markBusyIfAvailable({
      vehicleId: offer.vehicleId,
      activeTripId: offer.requestId
    });

    if (!busyVehicle) {
      throw new AppError(409, 'VEHICLE_NOT_AVAILABLE', 'Vehicle is no longer available for this request.');
    }

    const acceptedRequest = await this.kuliRequestRepository.acceptPending({
      requestId: offer.requestId,
      offerId: offer.id,
      ownerId: offer.ownerId,
      vehicleId: offer.vehicleId
    });

    if (!acceptedRequest) {
      await this.vehicleRepository.releaseIfActiveTrip({
        vehicleId: offer.vehicleId,
        activeTripId: offer.requestId
      });

      throw new AppError(409, 'REQUEST_ALREADY_ACCEPTED', 'Request already accepted or unavailable.');
    }

    await this.recordStatusEvent({
      request: acceptedRequest,
      fromStatus: kuliStatuses.pending,
      toStatus: kuliStatuses.accepted,
      actor,
      reason: 'offer_accepted'
    });

    const acceptedOffer = await this.tripOfferRepository.markAccepted({
      offerId: offer.id,
      ownerId: actor.id,
      now
    });

    if (!acceptedOffer) {
      await this.vehicleRepository.releaseIfActiveTrip({
        vehicleId: offer.vehicleId,
        activeTripId: offer.requestId
      });

      throw new AppError(409, 'OFFER_NOT_AVAILABLE', 'This offer is no longer available.');
    }

    await this.tripOfferRepository.expireCompeting({
      requestId: offer.requestId,
      exceptOfferId: offer.id
    });

    await this.notificationRepository.insertMany(
      acceptedRequest.clientId
        ? [
            createNotification({
              recipientUserId: acceptedRequest.clientId,
              type: 'offer.accepted',
              title: 'Truck owner accepted',
              body: 'Your KULI request has been accepted.',
              data: {
                requestId: acceptedRequest.id,
                offerId: offer.id,
                ownerId: actor.id
              }
            })
          ]
        : []
    );

    return {
      request: acceptedRequest,
      offer: acceptedOffer
    };
  }

  async expireTimedOutOffers({ now = new Date().toISOString() } = {}) {
    const staleOffers = await this.tripOfferRepository.expireStale(now);
    const requestIds = [...new Set(staleOffers.map((offer) => offer.requestId))];
    const timedOutRequests = [];

    for (const requestId of requestIds) {
      const remainingOpenOffers = (await this.tripOfferRepository.listByRequestId(requestId)).filter((offer) =>
        [offerStatuses.sent, offerStatuses.viewed].includes(offer.status)
      );

      if (remainingOpenOffers.length === 0) {
        const request = await this.kuliRequestRepository.markTimedOutIfPending(requestId);

        if (request) {
          await this.recordStatusEvent({
            request,
            fromStatus: kuliStatuses.pending,
            toStatus: kuliStatuses.timedOut,
            actor: null,
            reason: 'offer_timeout'
          });
          timedOutRequests.push(request);
        }
      }
    }

    return {
      expiredOfferCount: staleOffers.length,
      timedOutRequests
    };
  }

  async transitionRequestStatus({ actor, requestId, input }) {
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    const nextStatus = input.status;

    if (!Object.values(kuliStatuses).includes(nextStatus)) {
      throw new AppError(422, 'INVALID_STATUS', 'Unknown KULI request status.', {
        attemptedStatus: nextStatus
      });
    }

    const allowed = statusTransitions[request.status] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'This trip cannot move between those statuses.', {
        fromStatus: request.status,
        toStatus: nextStatus
      });
    }

    const isSelectedOwner = request.selectedOwnerId === actor.id;
    const isForwardOwnerUpdate =
      isSelectedOwner && actor.role === roles.truckOwner && nextStatus !== kuliStatuses.cancelled;
    const isOwnerCancellation = isSelectedOwner && actor.role === roles.truckOwner && nextStatus === kuliStatuses.cancelled;

    if (!isForwardOwnerUpdate && !isOwnerCancellation && !isStaff(actor)) {
      throw new AppError(403, 'STATUS_UPDATE_FORBIDDEN', 'Only the assigned owner or staff can update trip status.');
    }

    const update =
      nextStatus === kuliStatuses.cancelled
        ? {
            cancellation: {
              cancelledByUserId: actor.id,
              reason: input.reason ?? 'trip_cancelled',
              cancelledAt: new Date().toISOString()
            }
          }
        : {};
    const updatedRequest = await this.kuliRequestRepository.transitionStatus({
      requestId,
      fromStatus: request.status,
      toStatus: nextStatus,
      update
    });

    if (!updatedRequest) {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'This trip status changed before the command completed.');
    }

    if ([kuliStatuses.completed, kuliStatuses.cancelled].includes(nextStatus) && updatedRequest.selectedVehicleId) {
      await this.vehicleRepository.releaseIfActiveTrip({
        vehicleId: updatedRequest.selectedVehicleId,
        activeTripId: updatedRequest.id
      });
    }

    if (nextStatus === kuliStatuses.completed) {
      await this.ensureCompletedTripPaymentRecord(updatedRequest);
    }

    const event = await this.recordStatusEvent({
      request: updatedRequest,
      fromStatus: request.status,
      toStatus: nextStatus,
      actor,
      reason: input.reason ?? `status_${nextStatus}`
    });

    await this.notifyRequestParticipants({
      request: updatedRequest,
      actor,
      type: 'trip.status_changed',
      title: 'Trip status updated',
      body: `KULI request is now ${nextStatus.replaceAll('_', ' ')}.`,
      data: {
        requestId: updatedRequest.id,
        fromStatus: request.status,
        toStatus: nextStatus,
        statusEventId: event.id
      }
    });

    return {
      request: updatedRequest,
      event
    };
  }

  async listStatusEvents({ actor, requestId }) {
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request || !isRequestParticipant(actor, request)) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    return this.statusEventRepository.listByRequestId(requestId);
  }

  async sendMessage({ actor, requestId, input, idempotencyKey }) {
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request || !isRequestParticipant(actor, request)) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    if (terminalRequestStatuses.includes(request.status)) {
      throw new AppError(409, 'MESSAGE_THREAD_CLOSED', 'This request no longer accepts new messages.');
    }

    const body = typeof input.body === 'string' ? input.body.trim() : '';

    if (!body || body.length > 2000) {
      throw new AppError(422, 'INVALID_MESSAGE_BODY', 'Message body must be between 1 and 2000 characters.');
    }

    const clientGeneratedId = idempotencyKey ?? input.clientGeneratedId;
    const existing = await this.messageRepository.findBySenderAndClientGeneratedId({
      senderId: actor.id,
      clientGeneratedId
    });

    if (existing) {
      return {
        message: existing,
        idempotentReplay: true
      };
    }

    const message = await this.messageRepository.insert({
      id: createId('msg'),
      requestId,
      senderId: actor.id,
      senderRole: actor.role,
      body,
      clientGeneratedId,
      readBy: [
        {
          userId: actor.id,
          readAt: new Date().toISOString()
        }
      ]
    });

    await this.notifyRequestParticipants({
      request,
      actor,
      type: 'message.created',
      title: 'New trip message',
      body: 'A new message was sent on your KULI request.',
      data: {
        requestId,
        messageId: message.id
      }
    });

    return {
      message
    };
  }

  async listMessages({ actor, requestId }) {
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request || !isRequestParticipant(actor, request)) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    return this.messageRepository.listByRequestId(requestId);
  }

  async notifyRequestParticipants({ request, actor, type, title, body, data }) {
    const recipientIds = [request.clientId, request.selectedOwnerId].filter(Boolean);
    const notifications = [...new Set(recipientIds)]
      .filter((recipientUserId) => recipientUserId !== actor?.id)
      .map((recipientUserId) =>
        createNotification({
          recipientUserId,
          type,
          title,
          body,
          data
        })
      );

    return this.notificationRepository.insertMany(notifications);
  }
}

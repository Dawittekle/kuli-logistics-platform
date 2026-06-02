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
const paymentClosedMessageStatuses = [
  paymentStatuses.confirmedByOwner,
  paymentStatuses.resolved,
  paymentStatuses.cancelled
];

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

// Generates a human-friendly unique booking code (e.g. KULI-L48XJA-98F1) for customer queries and dispatching
const requestCode = () => `KULI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Guard: Enforce that the acting user holds the Client role
const assertClient = (user) => {
  if (user.role !== roles.client) {
    throw new AppError(403, 'CLIENT_REQUIRED', 'Only clients can create KULI requests in this flow.');
  }
};

// Guard: Enforce that the acting user holds the Truck Owner/Driver role
const assertTruckOwner = (user) => {
  if (user.role !== roles.truckOwner) {
    throw new AppError(403, 'TRUCK_OWNER_REQUIRED', 'Only truck owners can respond to offers.');
  }
};

// Guard: Enforce that the acting user is either an assisted-hotline assistant or a system admin
const assertAssistantOrAdmin = (user) => {
  if (![roles.assistant, roles.admin].includes(user.role)) {
    throw new AppError(403, 'ASSISTANT_REQUIRED', 'Only assistants or admins can create assisted requests.');
  }
};

// Returns true if the user belongs to the platform staff (admin or assistant)
const isStaff = (user) => [roles.admin, roles.assistant].includes(user.role);

// Security Check: Verifies if a user is legally authorized to view or edit a specific trip request
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
    quoteService,
    userRepository
  }) {
    this.kuliRequestRepository = kuliRequestRepository;
    this.tripOfferRepository = tripOfferRepository;
    this.vehicleRepository = vehicleRepository;
    this.notificationRepository = notificationRepository;
    this.statusEventRepository = statusEventRepository;
    this.messageRepository = messageRepository;
    this.paymentRepository = paymentRepository;
    this.quoteService = quoteService;
    this.userRepository = userRepository;
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

  async enrichRequest(request) {
    if (!request) {
      return null;
    }

    const [payment, selectedVehicle] = await Promise.all([
      this.paymentRepository ? this.paymentRepository.findByRequestId(request.id) : null,
      request.selectedVehicleId ? this.vehicleRepository.findById(request.selectedVehicleId) : null
    ]);

    return {
      ...request,
      payment: payment ?? undefined,
      selectedVehicleLocation: selectedVehicle?.currentLocation,
      selectedVehicleLocationUpdatedAt: selectedVehicle?.currentLocationUpdatedAt
    };
  }

  async enrichRequests(requests) {
    return Promise.all(requests.map((request) => this.enrichRequest(request)));
  }

  async isMessageThreadClosed(request) {
    if (terminalRequestStatuses.includes(request.status)) {
      return true;
    }

    if (request.status !== kuliStatuses.completed || !this.paymentRepository) {
      return false;
    }

    const payment = await this.paymentRepository.findByRequestId(request.id);
    return payment ? paymentClosedMessageStatuses.includes(payment.status) : false;
  }

  /**
   * Creates a new logistics/delivery request initiated directly by a client.
   * Leverages idempotency keys to prevent duplicate requests from network glitches.
   */
  async createRequest({ actor, input, idempotencyKey }) {
    assertClient(actor);

    // Retrieve previous result if idempotency key is matched
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

    // Calculate routing, estimates, and match matching vehicle candidates
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

    // Only route to approved and online/available trucks
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
          body: 'A new KULI request selected your vehicle.',
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
    const selectedVehicleIds = input.directAssignVehicleId
      ? [input.directAssignVehicleId]
      : input.selectedVehicleIds?.length
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

    const directAssignVehicle = input.directAssignVehicleId
      ? eligibleVehicles.find((vehicle) => vehicle.id === input.directAssignVehicleId)
      : null;
    const requestId = createId('kreq');
    const directOfferId = directAssignVehicle ? createId('offer') : undefined;
    const requestPayload = {
      id: requestId,
      requestCode: requestCode(),
      clientId: input.clientId,
      clientContactSnapshot: input.clientContactSnapshot,
      createdByAssistantId: actor.id,
      hotlineTicketId: input.hotlineTicketId,
      pickupLocation: input.pickupLocation,
      destinationLocation: input.destinationLocation,
      requestedPickupTime: input.requestedPickupTime,
      loadDetails: quote.loadDetails,
      requestedVehicleClassId: quote.requestedVehicleClass.id,
      quoteSnapshot: quote.quoteSnapshot,
      idempotencyKey
    };

    const expiresAt = new Date(Date.now() + offerExpiryMinutes * 60 * 1000).toISOString();

    if (input.directAssignVehicleId && !directAssignVehicle) {
      throw new AppError(409, 'DIRECT_ASSIGN_VEHICLE_NOT_AVAILABLE', 'Selected truck is no longer online and available.');
    }

    if (directAssignVehicle) {
      const busyVehicle = await this.vehicleRepository.markBusyIfAvailable({
        vehicleId: directAssignVehicle.id,
        activeTripId: requestId
      });

      if (!busyVehicle) {
        throw new AppError(409, 'VEHICLE_NOT_AVAILABLE', 'Selected truck is no longer available for assignment.');
      }

      try {
        const request = await this.kuliRequestRepository.save({
          ...requestPayload,
          status: kuliStatuses.accepted,
          selectedOwnerId: directAssignVehicle.ownerId,
          selectedVehicleId: directAssignVehicle.id,
          acceptedOfferId: directOfferId
        });

        const offers = await this.tripOfferRepository.insertMany([
          {
            id: directOfferId,
            requestId: request.id,
            ownerId: directAssignVehicle.ownerId,
            vehicleId: directAssignVehicle.id,
            status: offerStatuses.accepted,
            distanceKmAtOffer: quote.candidates.find((candidate) => candidate.vehicleId === directAssignVehicle.id)?.distanceKm,
            etaMinutesAtOffer: quote.route.etaMinutes,
            expiresAt,
            acceptedAt: new Date().toISOString(),
            assignedByAssistantId: actor.id
          }
        ]);

        await this.recordStatusEvent({
          request,
          fromStatus: kuliStatuses.pending,
          toStatus: kuliStatuses.accepted,
          actor,
          reason: 'assistant_direct_assignment'
        });

        await this.notificationRepository.insertMany(
          [
            createNotification({
              recipientUserId: directAssignVehicle.ownerId,
              type: 'assistant.assignment.created',
              title: 'Assigned KULI request',
              body: 'A hotline assistant assigned your truck to a confirmed KULI request.',
              data: {
                requestId: request.id,
                offerId: directOfferId,
                hotlineTicketId: input.hotlineTicketId
              }
            }),
            request.clientId
              ? createNotification({
                  recipientUserId: request.clientId,
                  type: 'assistant.request.assigned',
                  title: 'Truck assigned',
                  body: 'A KULI assistant assigned a verified truck to your request.',
                  data: {
                    requestId: request.id,
                    vehicleId: directAssignVehicle.id
                  }
                })
              : null
          ].filter(Boolean)
        );

        return {
          request: await this.enrichRequest(request),
          offers,
          assignment: {
            vehicleId: directAssignVehicle.id,
            ownerId: directAssignVehicle.ownerId,
            status: 'assigned_by_assistant'
          },
          waitingState: {
            status: 'assigned_by_assistant',
            offerCount: offers.length,
            expiresAt
          }
        };
      } catch (error) {
        await this.vehicleRepository.releaseIfActiveTrip({
          vehicleId: directAssignVehicle.id,
          activeTripId: requestId
        });

        throw error;
      }
    }

    const request = await this.kuliRequestRepository.save({
      ...requestPayload,
      status: kuliStatuses.pending
    });

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

  async assignAssistantRequest({ actor, requestId, vehicleId }) {
    assertAssistantOrAdmin(actor);

    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request || (actor.role === roles.assistant && request.createdByAssistantId !== actor.id)) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    if (request.status !== kuliStatuses.pending) {
      throw new AppError(409, 'REQUEST_NOT_ASSIGNABLE', 'Only waiting assisted requests can be assigned to a truck.');
    }

    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (
      !vehicle ||
      vehicle.verificationStatus !== verificationStatuses.approved ||
      vehicle.availabilityStatus !== vehicleAvailabilityStatuses.onlineAvailable
    ) {
      throw new AppError(409, 'VEHICLE_NOT_AVAILABLE', 'Selected truck is not approved and online.');
    }

    const existingOffers = await this.tripOfferRepository.listByRequestId(request.id);
    let offer = existingOffers.find((entry) => entry.vehicleId === vehicle.id);

    if (offer && ![offerStatuses.sent, offerStatuses.viewed].includes(offer.status)) {
      throw new AppError(409, 'OFFER_NOT_ASSIGNABLE', 'This truck already has a closed offer for the request.');
    }

    if (!offer) {
      const [createdOffer] = await this.tripOfferRepository.insertMany([
        {
          id: createId('offer'),
          requestId: request.id,
          ownerId: vehicle.ownerId,
          vehicleId: vehicle.id,
          status: offerStatuses.sent,
          expiresAt: new Date(Date.now() + offerExpiryMinutes * 60 * 1000).toISOString(),
          assignedByAssistantId: actor.id
        }
      ]);
      offer = createdOffer;
    }

    const busyVehicle = await this.vehicleRepository.markBusyIfAvailable({
      vehicleId: vehicle.id,
      activeTripId: request.id
    });

    if (!busyVehicle) {
      throw new AppError(409, 'VEHICLE_NOT_AVAILABLE', 'Selected truck is no longer available for assignment.');
    }

    const acceptedRequest = await this.kuliRequestRepository.acceptPending({
      requestId: request.id,
      offerId: offer.id,
      ownerId: vehicle.ownerId,
      vehicleId: vehicle.id
    });

    if (!acceptedRequest) {
      await this.vehicleRepository.releaseIfActiveTrip({
        vehicleId: vehicle.id,
        activeTripId: request.id
      });

      throw new AppError(409, 'REQUEST_NOT_ASSIGNABLE', 'The request changed before assignment completed.');
    }

    const acceptedOffer = await this.tripOfferRepository.markAccepted({
      offerId: offer.id,
      ownerId: vehicle.ownerId,
      now: new Date().toISOString()
    });
    const expiredCompetingOffers = await this.tripOfferRepository.expireCompeting({
      requestId: request.id,
      exceptOfferId: offer.id
    });

    await this.recordStatusEvent({
      request: acceptedRequest,
      fromStatus: request.status,
      toStatus: kuliStatuses.accepted,
      actor,
      reason: 'assistant_direct_assignment'
    });

    await this.notificationRepository.insertMany(
      [
        createNotification({
          recipientUserId: vehicle.ownerId,
          type: 'assistant.assignment.created',
          title: 'Assigned KULI request',
          body: 'A hotline assistant assigned your truck to a confirmed KULI request.',
          data: {
            requestId: acceptedRequest.id,
            offerId: offer.id
          }
        }),
        acceptedRequest.clientId
          ? createNotification({
              recipientUserId: acceptedRequest.clientId,
              type: 'assistant.request.assigned',
              title: 'Truck assigned',
              body: 'A KULI assistant assigned a verified truck to your request.',
              data: {
                requestId: acceptedRequest.id,
                vehicleId: vehicle.id
              }
            })
          : null,
        ...expiredCompetingOffers.map((expiredOffer) =>
          createNotification({
            recipientUserId: expiredOffer.ownerId,
            type: 'offer.expired',
            title: 'Request assigned to another truck',
            body: 'This assisted KULI request is no longer available.',
            data: {
              requestId: acceptedRequest.id,
              offerId: expiredOffer.id
            }
          })
        )
      ].filter(Boolean)
    );

    return {
      request: await this.enrichRequest(acceptedRequest),
      offer: acceptedOffer,
      assignment: {
        vehicleId: vehicle.id,
        ownerId: vehicle.ownerId,
        status: 'assigned_by_assistant'
      }
    };
  }

  async listMine({ actor }) {
    const requests = await this.kuliRequestRepository.listMine({
      userId: actor.id,
      role: actor.role
    });

    return this.enrichRequests(requests);
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

    return this.enrichRequest({
      ...request,
      offers: await this.tripOfferRepository.listByRequestId(request.id)
    });
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
          body: 'A pending KULI request was cancelled.',
          data: {
            requestId,
            offerId: offer.id
          }
        })
      )
    );

    return {
      request: await this.enrichRequest(cancelledRequest),
      offers
    };
  }

  async listOwnerOffers({ actor }) {
    assertTruckOwner(actor);
    const offers = await this.tripOfferRepository.listByOwnerId(actor.id);

    return Promise.all(
      offers.map(async (offer) => ({
        ...offer,
          request: await this.enrichRequest(await this.kuliRequestRepository.findById(offer.requestId))
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

  /**
   * Concurrency-safe acceptance of an offer by a truck owner.
   * Uses database-level atomic updates to ensure only one driver can accept a request.
   */
  async acceptOffer({ actor, offerId, idempotencyKey }) {
    assertTruckOwner(actor);

    const now = new Date().toISOString();
    const offer = await this.tripOfferRepository.findById(offerId);

    if (!offer || offer.ownerId !== actor.id) {
      throw new AppError(404, 'OFFER_NOT_FOUND', 'Offer was not found.');
    }

    // Return the request details if the driver had already successfully accepted it
    if (offer.status === offerStatuses.accepted) {
      const request = await this.kuliRequestRepository.findById(offer.requestId);

      if (request?.acceptedOfferId === offer.id) {
        return {
          request: await this.enrichRequest(request),
          offer,
          idempotentReplay: Boolean(idempotencyKey)
        };
      }
    }

    if (![offerStatuses.sent, offerStatuses.viewed].includes(offer.status) || offer.expiresAt <= now) {
      throw new AppError(409, 'OFFER_NOT_AVAILABLE', 'This offer is no longer available.');
    }

    // Step 1: Lock the vehicle status to busy so no other offers can be routed to it
    const busyVehicle = await this.vehicleRepository.markBusyIfAvailable({
      vehicleId: offer.vehicleId,
      activeTripId: offer.requestId
    });

    if (!busyVehicle) {
      throw new AppError(409, 'VEHICLE_NOT_AVAILABLE', 'Vehicle is no longer available for this request.');
    }

    // Step 2: Atomically transition request from PENDING to ACCEPTED. First accept wins.
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

    const expiredCompetingOffers = await this.tripOfferRepository.expireCompeting({
      requestId: offer.requestId,
      exceptOfferId: offer.id
    });

    await this.notificationRepository.insertMany(
      [
        ...(acceptedRequest.clientId
          ? [
              createNotification({
                recipientUserId: acceptedRequest.clientId,
                type: 'offer.accepted',
                title: 'Truck owner accepted',
                body: 'Your KULI request has been accepted. Other pending offers were closed automatically.',
                data: {
                  requestId: acceptedRequest.id,
                  offerId: offer.id,
                  ownerId: actor.id
                }
              })
            ]
          : []),
        ...expiredCompetingOffers.map((expiredOffer) =>
          createNotification({
            recipientUserId: expiredOffer.ownerId,
            type: 'offer.expired',
            title: 'Request accepted by another owner',
            body: 'This KULI request is no longer available because another truck owner accepted first.',
            data: {
              requestId: acceptedRequest.id,
              offerId: expiredOffer.id
            }
          })
        )
      ]
    );

    return {
      request: await this.enrichRequest(acceptedRequest),
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
      request: await this.enrichRequest(updatedRequest),
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

    if (await this.isMessageThreadClosed(request)) {
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

    const messages = await this.messageRepository.listByRequestId(requestId);

    if (!this.userRepository) {
      return messages;
    }

    const senderIds = [...new Set(messages.map((message) => message.senderId).filter(Boolean))];
    const senderEntries = await Promise.all(
      senderIds.map(async (senderId) => {
        const user = await this.userRepository.findById(senderId);
        return [senderId, user?.fullName || user?.email || ''];
      })
    );
    const senderNames = new Map(senderEntries);

    return messages.map((message) => ({
      ...message,
      senderDisplayName: senderNames.get(message.senderId) || undefined
    }));
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

import { kuliStatuses, offerStatuses, roles, vehicleAvailabilityStatuses, verificationStatuses } from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const offerExpiryMinutes = 10;

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
    quoteService
  }) {
    this.kuliRequestRepository = kuliRequestRepository;
    this.tripOfferRepository = tripOfferRepository;
    this.vehicleRepository = vehicleRepository;
    this.notificationRepository = notificationRepository;
    this.quoteService = quoteService;
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

    const cancelledRequest = await this.kuliRequestRepository.cancelPending({
      requestId,
      actorUserId: actor.id,
      reason: input.reason ?? 'client_cancelled'
    });

    if (!cancelledRequest) {
      throw new AppError(409, 'REQUEST_CANNOT_BE_CANCELLED', 'This request cannot be cancelled.');
    }

    await this.tripOfferRepository.cancelForRequest(requestId);

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
    return this.tripOfferRepository.listByOwnerId(actor.id);
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

    await this.notificationRepository.insertMany([
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
    ]);

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
          timedOutRequests.push(request);
        }
      }
    }

    return {
      expiredOfferCount: staleOffers.length,
      timedOutRequests
    };
  }
}

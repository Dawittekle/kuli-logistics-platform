const collectionName = 'trip_offers';

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

export class MongoTripOfferRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { requestId: 1, vehicleId: 1 },
        unique: true,
        name: 'trip_offers_request_vehicle_unique'
      },
      {
        key: { ownerId: 1, status: 1, createdAt: -1 },
        name: 'trip_offers_owner_status_created_idx'
      },
      {
        key: { requestId: 1, status: 1 },
        name: 'trip_offers_request_status_idx'
      },
      {
        key: { status: 1, expiresAt: 1 },
        name: 'trip_offers_status_expires_idx'
      }
    ]);
  }

  async insertMany(offers) {
    if (offers.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const documents = offers.map(({ id, ...offer }) => ({
      _id: id,
      ...offer,
      createdAt: offer.createdAt ?? now,
      updatedAt: now
    }));

    await this.collection.insertMany(documents);
    return this.listByRequestId(offers[0].requestId);
  }

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id }));
  }

  async listByRequestId(requestId) {
    const documents = await this.collection.find({ requestId }, { sort: { createdAt: 1 } }).toArray();
    return documents.map(normalize);
  }

  async listByOwnerId(ownerId) {
    const documents = await this.collection
      .find({ ownerId, status: { $in: ['sent', 'viewed'] } }, { sort: { createdAt: -1 } })
      .toArray();
    return documents.map(normalize);
  }

  async markViewed({ offerId, ownerId }) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: offerId,
        ownerId,
        status: 'sent'
      },
      {
        $set: {
          status: 'viewed',
          viewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result) ?? this.findById(offerId);
  }

  async markDeclined({ offerId, ownerId, declineReason }) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: offerId,
        ownerId,
        status: { $in: ['sent', 'viewed'] }
      },
      {
        $set: {
          status: 'declined',
          declinedAt: new Date().toISOString(),
          declineReason,
          updatedAt: new Date().toISOString()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }

  async markAccepted({ offerId, ownerId, now }) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: offerId,
        ownerId,
        status: { $in: ['sent', 'viewed'] },
        expiresAt: { $gt: now }
      },
      {
        $set: {
          status: 'accepted',
          acceptedAt: now,
          updatedAt: now
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }

  async expireCompeting({ requestId, exceptOfferId }) {
    const competingOffers = await this.collection
      .find({
        requestId,
        _id: { $ne: exceptOfferId },
        status: { $in: ['sent', 'viewed'] }
      })
      .toArray();

    if (competingOffers.length === 0) {
      return [];
    }

    await this.collection.updateMany(
      {
        requestId,
        _id: { $in: competingOffers.map((offer) => offer._id) }
      },
      {
        $set: {
          status: 'expired',
          updatedAt: new Date().toISOString()
        }
      }
    );

    return competingOffers.map((offer) =>
      normalize({
        ...offer,
        status: 'expired'
      })
    );
  }

  async cancelForRequest(requestId) {
    await this.collection.updateMany(
      {
        requestId,
        status: { $in: ['sent', 'viewed'] }
      },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        }
      }
    );
  }

  async expireStale(now) {
    const staleOffers = await this.collection
      .find({
        status: { $in: ['sent', 'viewed'] },
        expiresAt: { $lte: now }
      })
      .toArray();

    if (staleOffers.length === 0) {
      return [];
    }

    await this.collection.updateMany(
      {
        _id: { $in: staleOffers.map((offer) => offer._id) }
      },
      {
        $set: {
          status: 'expired',
          updatedAt: now
        }
      }
    );

    return staleOffers.map(normalize);
  }
}

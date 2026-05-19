const collectionName = 'kuli_requests';

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

export class MongoKuliRequestRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { requestCode: 1 },
        unique: true,
        name: 'kuli_requests_code_unique'
      },
      {
        key: { clientId: 1, idempotencyKey: 1 },
        unique: true,
        sparse: true,
        name: 'kuli_requests_client_idempotency_unique'
      },
      {
        key: { hotlineTicketId: 1 },
        unique: true,
        sparse: true,
        name: 'kuli_requests_hotline_ticket_unique'
      },
      {
        key: { clientId: 1, status: 1, createdAt: -1 },
        name: 'kuli_requests_client_status_created_idx'
      },
      {
        key: { selectedOwnerId: 1, status: 1, createdAt: -1 },
        name: 'kuli_requests_owner_status_created_idx'
      },
      {
        key: { status: 1, createdAt: -1 },
        name: 'kuli_requests_status_created_idx'
      },
      {
        key: { 'pickupLocation.point': '2dsphere' },
        name: 'kuli_requests_pickup_2dsphere'
      }
    ]);
  }

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id, deletedAt: { $exists: false } }));
  }

  async findByClientIdAndIdempotencyKey({ clientId, idempotencyKey }) {
    if (!idempotencyKey) {
      return null;
    }

    return normalize(await this.collection.findOne({ clientId, idempotencyKey, deletedAt: { $exists: false } }));
  }

  async findByHotlineTicketId(hotlineTicketId) {
    if (!hotlineTicketId) {
      return null;
    }

    return normalize(await this.collection.findOne({ hotlineTicketId, deletedAt: { $exists: false } }));
  }

  async listMine({ userId, role }) {
    const query =
      role === 'truck_owner'
        ? { selectedOwnerId: userId }
        : role === 'assistant'
          ? { createdByAssistantId: userId }
          : role === 'admin'
            ? {}
            : { clientId: userId };
    const documents = await this.collection.find(query, { sort: { createdAt: -1 } }).toArray();
    return documents.map(normalize);
  }

  async save(kuliRequest) {
    const now = new Date().toISOString();
    const record = {
      ...kuliRequest,
      createdAt: kuliRequest.createdAt ?? now,
      updatedAt: now
    };
    const { id, ...document } = record;

    await this.collection.replaceOne(
      { _id: id },
      {
        _id: id,
        ...document
      },
      { upsert: true }
    );

    return this.findById(id);
  }

  async acceptPending({ requestId, offerId, ownerId, vehicleId }) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: requestId,
        status: 'pending',
        deletedAt: { $exists: false }
      },
      {
        $set: {
          status: 'accepted',
          selectedOwnerId: ownerId,
          selectedVehicleId: vehicleId,
          acceptedOfferId: offerId,
          updatedAt: new Date().toISOString()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }

  async transitionStatus({ requestId, fromStatus, toStatus, update = {} }) {
    const now = new Date().toISOString();
    const result = await this.collection.findOneAndUpdate(
      {
        _id: requestId,
        status: fromStatus,
        deletedAt: { $exists: false }
      },
      {
        $set: {
          ...update,
          status: toStatus,
          updatedAt: now
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }

  async markTimedOutIfPending(requestId) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: requestId,
        status: 'pending',
        deletedAt: { $exists: false }
      },
      {
        $set: {
          status: 'timed_out',
          updatedAt: new Date().toISOString()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }

  async cancelPending({ requestId, actorUserId, reason }) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: requestId,
        clientId: actorUserId,
        status: 'pending',
        deletedAt: { $exists: false }
      },
      {
        $set: {
          status: 'cancelled',
          cancellation: {
            cancelledByUserId: actorUserId,
            reason,
            cancelledAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }
}

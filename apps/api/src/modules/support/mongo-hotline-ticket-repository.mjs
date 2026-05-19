const collectionName = 'hotline_tickets';

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

export class MongoHotlineTicketRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { ticketCode: 1 },
        unique: true,
        name: 'hotline_tickets_code_unique'
      },
      {
        key: { status: 1, createdAt: -1 },
        name: 'hotline_tickets_status_created_idx'
      },
      {
        key: { assignedAssistantId: 1, status: 1 },
        name: 'hotline_tickets_assistant_status_idx'
      },
      {
        key: { callerPhone: 1, createdAt: -1 },
        name: 'hotline_tickets_caller_created_idx'
      }
    ]);
  }

  async save(ticket) {
    const now = new Date().toISOString();
    const record = {
      ...ticket,
      createdAt: ticket.createdAt ?? now,
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

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id }));
  }

  async list({ status, assignedAssistantId, callerPhone } = {}) {
    const query = {};

    if (status) {
      query.status = status;
    }

    if (assignedAssistantId) {
      query.assignedAssistantId = assignedAssistantId;
    }

    if (callerPhone) {
      query.callerPhone = callerPhone;
    }

    const documents = await this.collection.find(query, { sort: { createdAt: -1 }, limit: 50 }).toArray();
    return documents.map(normalize);
  }

  async transition({ ticketId, fromStatus, toStatus, update = {} }) {
    const now = new Date().toISOString();
    const result = await this.collection.findOneAndUpdate(
      {
        _id: ticketId,
        status: fromStatus
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

  async linkRequest({ ticketId, requestId }) {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: ticketId,
        status: { $nin: ['closed', 'cancelled'] }
      },
      {
        $set: {
          requestId,
          updatedAt: new Date().toISOString()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    return normalize(result);
  }

  async expirePendingClient(now) {
    const staleTickets = await this.collection
      .find({
        status: 'pending_client',
        followUpAt: { $lte: now }
      })
      .toArray();

    if (staleTickets.length === 0) {
      return [];
    }

    await this.collection.updateMany(
      {
        _id: { $in: staleTickets.map((ticket) => ticket._id) }
      },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: 'no_response_timeout',
          closedAt: now,
          updatedAt: now
        }
      }
    );

    const documents = await this.collection.find({ _id: { $in: staleTickets.map((ticket) => ticket._id) } }).toArray();
    return documents.map(normalize);
  }
}

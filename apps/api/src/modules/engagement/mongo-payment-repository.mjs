const collectionName = 'payments';

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

export class MongoPaymentRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { requestId: 1 },
        unique: true,
        name: 'payments_request_unique'
      },
      {
        key: { status: 1, createdAt: -1 },
        name: 'payments_status_created_idx'
      },
      {
        key: { payeeOwnerId: 1, createdAt: -1 },
        name: 'payments_payee_created_idx'
      }
    ]);
  }

  async findByRequestId(requestId) {
    return normalize(await this.collection.findOne({ requestId }));
  }

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id }));
  }

  async save(payment) {
    const now = new Date().toISOString();
    const record = {
      ...payment,
      createdAt: payment.createdAt ?? now,
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

  async list() {
    const documents = await this.collection.find({}, { sort: { createdAt: -1 }, limit: 100 }).toArray();
    return documents.map(normalize);
  }
}

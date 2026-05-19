const collectionName = 'reports';

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

export class MongoReportRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { reportCode: 1 },
        unique: true,
        name: 'reports_code_unique'
      },
      {
        key: { status: 1, createdAt: -1 },
        name: 'reports_status_created_idx'
      },
      {
        key: { reportedUserId: 1, status: 1 },
        name: 'reports_reported_user_status_idx'
      },
      {
        key: { requestId: 1 },
        name: 'reports_request_idx'
      }
    ]);
  }

  async save(report) {
    const now = new Date().toISOString();
    const record = {
      ...report,
      createdAt: report.createdAt ?? now,
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

  async list({ status, category } = {}) {
    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    const documents = await this.collection.find(query, { sort: { createdAt: -1 }, limit: 100 }).toArray();
    return documents.map(normalize);
  }
}

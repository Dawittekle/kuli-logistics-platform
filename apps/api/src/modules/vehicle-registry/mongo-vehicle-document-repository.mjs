const collectionName = 'vehicle_documents';

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

export class MongoVehicleDocumentRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { vehicleId: 1, type: 1 },
        name: 'vehicle_documents_vehicle_type_idx'
      },
      {
        key: { status: 1, uploadedAt: -1 },
        name: 'vehicle_documents_status_uploaded_idx'
      }
    ]);
  }

  async listByVehicleId(vehicleId) {
    const documents = await this.collection.find({ vehicleId }, { sort: { uploadedAt: -1 } }).toArray();
    return documents.map(normalize);
  }

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id }));
  }

  async save(documentRecord) {
    const record = {
      ...documentRecord,
      uploadedAt: documentRecord.uploadedAt ?? new Date().toISOString()
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

    return normalize(await this.collection.findOne({ _id: id }));
  }
}

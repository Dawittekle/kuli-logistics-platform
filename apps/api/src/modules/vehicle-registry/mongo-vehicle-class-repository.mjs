const collectionName = 'vehicle_classes';

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

export class MongoVehicleClassRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { slug: 1 },
        unique: true,
        name: 'vehicle_classes_slug_unique'
      },
      {
        key: { active: 1, displayOrder: 1 },
        name: 'vehicle_classes_active_display_order_idx'
      }
    ]);
  }

  async listActive() {
    const documents = await this.collection
      .find({ active: true, deletedAt: { $exists: false } }, { sort: { displayOrder: 1, name: 1 } })
      .toArray();

    return documents.map(normalize);
  }

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id, deletedAt: { $exists: false } }));
  }

  async findBySlug(slug) {
    return normalize(await this.collection.findOne({ slug, deletedAt: { $exists: false } }));
  }

  async save(vehicleClass) {
    const now = new Date().toISOString();
    const record = {
      ...vehicleClass,
      createdAt: vehicleClass.createdAt ?? now,
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

    return normalize(await this.collection.findOne({ _id: id }));
  }
}

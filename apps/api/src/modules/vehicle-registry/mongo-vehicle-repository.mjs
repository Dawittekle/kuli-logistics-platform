const collectionName = 'vehicles';

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

export class MongoVehicleRepository {
  constructor({ db }) {
    this.collection = db.collection(collectionName);
  }

  async ensureIndexes() {
    await this.collection.createIndexes([
      {
        key: { licensePlate: 1 },
        unique: true,
        name: 'vehicles_license_plate_unique'
      },
      {
        key: { ownerId: 1, deletedAt: 1 },
        name: 'vehicles_owner_deleted_idx'
      },
      {
        key: { verificationStatus: 1, availabilityStatus: 1 },
        name: 'vehicles_verification_availability_idx'
      },
      {
        key: { vehicleClassId: 1, verificationStatus: 1, availabilityStatus: 1 },
        name: 'vehicles_class_verification_availability_idx'
      },
      {
        key: { 'currentLocation.point': '2dsphere' },
        name: 'vehicles_current_location_2dsphere',
        sparse: true
      }
    ]);
  }

  async listByOwnerId(ownerId) {
    const documents = await this.collection
      .find({ ownerId, deletedAt: { $exists: false } }, { sort: { createdAt: -1 } })
      .toArray();

    return documents.map(normalize);
  }

  async listPendingVerification() {
    const documents = await this.collection
      .find({ verificationStatus: 'pending', deletedAt: { $exists: false } }, { sort: { verificationSubmittedAt: 1 } })
      .toArray();

    return documents.map(normalize);
  }

  async findById(id) {
    return normalize(await this.collection.findOne({ _id: id, deletedAt: { $exists: false } }));
  }

  async findApprovedAvailableNearby({ point, radiusKm, vehicleClassId = undefined }) {
    const query = {
      verificationStatus: 'approved',
      availabilityStatus: 'online_available',
      deletedAt: { $exists: false },
      'currentLocation.point': {
        $nearSphere: {
          $geometry: point,
          $maxDistance: radiusKm * 1000
        }
      }
    };

    if (vehicleClassId) {
      query.vehicleClassId = vehicleClassId;
    }

    const documents = await this.collection.find(query, { limit: 25 }).toArray();
    return documents.map(normalize);
  }

  async save(vehicle) {
    const now = new Date().toISOString();
    const record = {
      ...vehicle,
      createdAt: vehicle.createdAt ?? now,
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
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { roles, vehicleAvailabilityStatuses, verificationStatuses } from '../../../../packages/shared/src/index.mjs';
import { AppError } from '../common/errors/app-error.mjs';
import { VehicleRegistryService } from '../modules/vehicle-registry/vehicle-registry-service.mjs';

class MemoryRepository {
  constructor() {
    this.records = new Map();
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async save(record) {
    const now = new Date().toISOString();
    const saved = {
      ...record,
      createdAt: record.createdAt ?? now,
      updatedAt: now
    };

    this.records.set(saved.id, saved);
    return saved;
  }
}

class MemoryVehicleClassRepository extends MemoryRepository {
  async findBySlug(slug) {
    return Array.from(this.records.values()).find((record) => record.slug === slug && !record.deletedAt) ?? null;
  }

  async listActive() {
    return Array.from(this.records.values())
      .filter((record) => record.active && !record.deletedAt)
      .sort((left, right) => left.displayOrder - right.displayOrder);
  }
}

class MemoryVehicleRepository extends MemoryRepository {
  async listByOwnerId(ownerId) {
    return Array.from(this.records.values()).filter((record) => record.ownerId === ownerId && !record.deletedAt);
  }

  async listPendingVerification() {
    return Array.from(this.records.values()).filter((record) => record.verificationStatus === verificationStatuses.pending);
  }
}

class MemoryVehicleDocumentRepository extends MemoryRepository {
  async listByVehicleId(vehicleId) {
    return Array.from(this.records.values()).filter((record) => record.vehicleId === vehicleId);
  }
}

class MemoryAuditLogRepository {
  constructor() {
    this.entries = [];
  }

  async write(entry) {
    this.entries.push(entry);
    return entry;
  }
}

const createService = () => {
  const auditLogRepository = new MemoryAuditLogRepository();
  const service = new VehicleRegistryService({
    vehicleClassRepository: new MemoryVehicleClassRepository(),
    vehicleRepository: new MemoryVehicleRepository(),
    vehicleDocumentRepository: new MemoryVehicleDocumentRepository(),
    fileRepository: new MemoryRepository(),
    auditLogRepository
  });

  return {
    service,
    auditLogRepository
  };
};

const truckOwner = {
  id: 'usr_owner_001',
  role: roles.truckOwner
};

const admin = {
  id: 'usr_admin_001',
  role: roles.admin
};

test('phase 2 seeds active vehicle classes', async () => {
  const { service } = createService();

  await service.seedDefaultVehicleClasses();
  const classes = await service.listActiveVehicleClasses();

  assert.equal(classes.length, 3);
  assert.equal(classes[0].slug, 'small-pickup');
});

test('pending vehicle cannot go online until admin approves it', async () => {
  const { service, auditLogRepository } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();

  const vehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-12345',
      capacityKg: 700
    }
  });

  assert.equal(vehicle.verificationStatus, verificationStatuses.pending);

  await assert.rejects(
    () =>
      service.updateAvailability({
        actor: truckOwner,
        vehicleId: vehicle.id,
        input: {
          availabilityStatus: vehicleAvailabilityStatuses.onlineAvailable
        }
      }),
    (error) => error instanceof AppError && error.code === 'VEHICLE_NOT_VERIFIED'
  );

  await service.decideVerification({
    actor: admin,
    vehicleId: vehicle.id,
    input: {
      verificationStatus: verificationStatuses.approved
    }
  });

  const onlineVehicle = await service.updateAvailability({
    actor: truckOwner,
    vehicleId: vehicle.id,
    input: {
      availabilityStatus: vehicleAvailabilityStatuses.onlineAvailable
    }
  });

  assert.equal(onlineVehicle.availabilityStatus, vehicleAvailabilityStatuses.onlineAvailable);
  assert.equal(auditLogRepository.entries[0].action, 'vehicle.approved');
});

test('admin rejection requires a reason and keeps vehicle offline', async () => {
  const { service } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();
  const vehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-54321'
    }
  });

  await assert.rejects(
    () =>
      service.decideVerification({
        actor: admin,
        vehicleId: vehicle.id,
        input: {
          verificationStatus: verificationStatuses.rejected
        }
      }),
    (error) => error instanceof AppError && error.code === 'REJECTION_REASON_REQUIRED'
  );

  const rejected = await service.decideVerification({
    actor: admin,
    vehicleId: vehicle.id,
    input: {
      verificationStatus: verificationStatuses.rejected,
      reason: 'Registration certificate is unreadable.'
    }
  });

  assert.equal(rejected.verificationStatus, verificationStatuses.rejected);
  assert.equal(rejected.availabilityStatus, vehicleAvailabilityStatuses.offline);
  assert.equal(rejected.rejectionReason, 'Registration certificate is unreadable.');
});

test('vehicle document upload intent validates type and size', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.createUploadIntent({
        actor: truckOwner,
        input: {
          vehicleId: 'veh_001',
          type: 'driver_license',
          mimeType: 'application/x-msdownload',
          sizeBytes: 2048
        }
      }),
    (error) => error instanceof AppError && error.code === 'DOCUMENT_UPLOAD_INVALID'
  );

  const intent = await service.createUploadIntent({
    actor: truckOwner,
    input: {
      vehicleId: 'veh_001',
      type: 'driver_license',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      originalFileName: 'license.pdf'
    }
  });

  assert.equal(intent.file.mimeType, 'application/pdf');
  assert.equal(intent.upload.method, 'PUT');
});

test('admin file preview creates signed url and audit log', async () => {
  const { service, auditLogRepository } = createService();
  const intent = await service.createUploadIntent({
    actor: truckOwner,
    input: {
      vehicleId: 'veh_001',
      type: 'vehicle_registration',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      originalFileName: 'registration.pdf'
    }
  });

  const signedUrl = await service.createSignedFileUrl({
    actor: admin,
    fileId: intent.file.id
  });

  assert.equal(signedUrl.fileId, intent.file.id);
  assert.match(signedUrl.url, /^local-dev:\/\/signed-read\//);
  assert.equal(auditLogRepository.entries[0].action, 'file.signed_url.created');
});

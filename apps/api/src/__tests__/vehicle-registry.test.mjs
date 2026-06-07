import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
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

  async complete({ fileId, update = {} }) {
    const record = this.records.get(fileId);

    if (!record) {
      return null;
    }

    const completed = {
      ...record,
      ...update,
      status: 'uploaded',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.records.set(fileId, completed);
    return completed;
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

  async listForAdmin() {
    return Array.from(this.records.values())
      .sort((left, right) => Number(right.active) - Number(left.active) || left.displayOrder - right.displayOrder);
  }
}

class MongoLikeVehicleClassRepository extends MemoryVehicleClassRepository {
  async findById(id) {
    const record = this.records.get(id);

    if (!record || Object.prototype.hasOwnProperty.call(record, 'deletedAt')) {
      return null;
    }

    return record;
  }

  async save(record) {
    const now = new Date().toISOString();
    const serialized = Object.fromEntries(
      Object.entries({
        ...record,
        createdAt: record.createdAt ?? now,
        updatedAt: now
      }).map(([key, value]) => [key, value === undefined ? null : value])
    );

    this.records.set(serialized.id, serialized);
    return serialized;
  }
}

class MemoryVehicleRepository extends MemoryRepository {
  async listByOwnerId(ownerId) {
    return Array.from(this.records.values()).filter((record) => record.ownerId === ownerId && !record.deletedAt);
  }

  async listPendingVerification() {
    return Array.from(this.records.values()).filter((record) => record.verificationStatus === verificationStatuses.pending);
  }

  async listForAdmin({ verificationStatus, availabilityStatus, search } = {}) {
    return Array.from(this.records.values()).filter((record) => {
      const haystack = `${record.licensePlate ?? ''} ${record.ownerId ?? ''} ${record.description ?? ''}`.toLowerCase();

      return (
        !record.deletedAt &&
        (!verificationStatus || record.verificationStatus === verificationStatus) &&
        (!availabilityStatus || record.availabilityStatus === availabilityStatus) &&
        (!search || haystack.includes(String(search).toLowerCase()))
      );
    });
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

class MemoryFileStorage {
  constructor() {
    this.bucketName = 'vehicle_documents';
    this.files = new Map();
  }

  async upload({ file, stream, contentType }) {
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const body = Buffer.concat(chunks);
    this.files.set(file.id, {
      body,
      contentType,
      filename: file.originalFileName
    });

    return {
      bucketName: this.bucketName,
      gridFsFileId: file.id,
      uploadedSizeBytes: body.length
    };
  }

  async openDownloadStream(file) {
    const stored = this.files.get(file.gridFsFileId ?? file.id);

    if (!stored) {
      throw new AppError(404, 'GRIDFS_FILE_NOT_FOUND', 'Stored verification file was not found.');
    }

    return {
      gridFile: {
        _id: file.gridFsFileId ?? file.id,
        filename: stored.filename,
        length: stored.body.length,
        contentType: stored.contentType
      },
      stream: Readable.from(stored.body)
    };
  }
}

const createService = ({ vehicleClassRepository = new MemoryVehicleClassRepository() } = {}) => {
  const auditLogRepository = new MemoryAuditLogRepository();
  const fileStorage = new MemoryFileStorage();
  const service = new VehicleRegistryService({
    vehicleClassRepository,
    vehicleRepository: new MemoryVehicleRepository(),
    vehicleDocumentRepository: new MemoryVehicleDocumentRepository(),
    fileRepository: new MemoryRepository(),
    fileStorage,
    auditLogRepository
  });

  return {
    service,
    auditLogRepository,
    fileStorage
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

test('vehicle class update remains editable before explicit deactivation', async () => {
  const { service } = createService({
    vehicleClassRepository: new MongoLikeVehicleClassRepository()
  });

  const vehicleClass = await service.createVehicleClass({
    actor: admin,
    input: {
      slug: 'compact-van-test',
      name: 'Compact Van Test',
      active: true
    }
  });

  const updated = await service.updateVehicleClass({
    actor: admin,
    vehicleClassId: vehicleClass.id,
    input: {
      description: 'Updated without deactivation.'
    }
  });

  assert.equal(updated.description, 'Updated without deactivation.');

  const deactivated = await service.deactivateVehicleClass({
    actor: admin,
    vehicleClassId: vehicleClass.id
  });

  assert.equal(deactivated.active, false);

  await assert.rejects(
    () =>
      service.updateVehicleClass({
        actor: admin,
        vehicleClassId: vehicleClass.id,
        input: {
          description: 'Should stay hidden after deactivation.'
        }
      }),
    (error) => error instanceof AppError && error.code === 'VEHICLE_CLASS_NOT_FOUND'
  );
});

test('admin vehicle class list includes inactive classes', async () => {
  const { service } = createService({
    vehicleClassRepository: new MongoLikeVehicleClassRepository()
  });

  const vehicleClass = await service.createVehicleClass({
    actor: admin,
    input: {
      slug: 'inactive-visible',
      name: 'Inactive Visible',
      active: true
    }
  });

  await service.deactivateVehicleClass({
    actor: admin,
    vehicleClassId: vehicleClass.id
  });

  const classes = await service.listAdminVehicleClasses({
    actor: admin
  });

  assert.equal(classes.length, 1);
  assert.equal(classes[0].active, false);
});

test('admin vehicle list filters verification state and includes documents', async () => {
  const { service } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();
  const pendingVehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-LIST-1'
    }
  });
  const approvedVehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-LIST-2'
    }
  });

  await service.vehicleDocumentRepository.save({
    id: 'vdoc_admin_list',
    vehicleId: pendingVehicle.id,
    type: 'identity',
    fileId: 'file_admin_list',
    status: 'uploaded'
  });
  await service.decideVerification({
    actor: admin,
    vehicleId: approvedVehicle.id,
    input: {
      verificationStatus: verificationStatuses.approved
    }
  });

  const pendingVehicles = await service.listAdminVehicles({
    actor: admin,
    filters: {
      verificationStatus: verificationStatuses.pending,
      search: 'AA-LIST'
    }
  });

  assert.equal(pendingVehicles.length, 1);
  assert.equal(pendingVehicles[0].id, pendingVehicle.id);
  assert.equal(pendingVehicles[0].documents.length, 1);
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
  assert.equal(intent.file.storageProvider, 'gridfs');
  assert.equal(intent.file.storageKey, `gridfs://vehicle_documents/${intent.file.id}`);
  assert.equal(intent.upload.method, 'POST');
  assert.equal(intent.upload.url, `/api/v1/files/${intent.file.id}/upload`);
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
  assert.equal(signedUrl.url, `/api/v1/files/${intent.file.id}/download`);
  assert.equal(auditLogRepository.entries[0].action, 'file.signed_url.created');
});

test('admin vehicle document preview verifies vehicle-document-file linkage and audits', async () => {
  const { service, auditLogRepository } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();
  const vehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-PREVIEW-1'
    }
  });
  const intent = await service.createUploadIntent({
    actor: truckOwner,
    input: {
      vehicleId: vehicle.id,
      type: 'identity',
      mimeType: 'image/jpeg',
      sizeBytes: 4096,
      originalFileName: 'identity.jpg'
    }
  });

  await service.completeFileUpload({
    actor: truckOwner,
    fileId: intent.file.id,
    input: {
      uploadedSizeBytes: 4096
    }
  });
  const document = await service.attachVehicleDocument({
    actor: truckOwner,
    vehicleId: vehicle.id,
    input: {
      type: 'identity',
      fileId: intent.file.id
    }
  });

  const preview = await service.createAdminVehicleDocumentPreviewUrl({
    actor: admin,
    vehicleId: vehicle.id,
    documentId: document.id
  });

  assert.equal(preview.documentId, document.id);
  assert.equal(preview.file.originalFileName, 'identity.jpg');
  assert.equal(preview.file.mimeType, 'image/jpeg');
  assert.equal(preview.file.storageProvider, 'gridfs');
  assert.equal(preview.expiresInSeconds, 300);
  assert.equal(preview.url, `/api/v1/admin/vehicles/${vehicle.id}/documents/${document.id}/preview`);
  assert.equal(auditLogRepository.entries.at(-1).action, 'vehicle.document.preview_url.created');
});

test('admin vehicle document preview streams stored GridFS file', async () => {
  const { service, auditLogRepository } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();
  const vehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-STREAM-1'
    }
  });
  const intent = await service.createUploadIntent({
    actor: truckOwner,
    input: {
      vehicleId: vehicle.id,
      type: 'vehicle_registration',
      mimeType: 'application/pdf',
      sizeBytes: 16,
      originalFileName: 'registration.pdf'
    }
  });
  const uploaded = await service.uploadFileContent({
    actor: truckOwner,
    fileId: intent.file.id,
    stream: Readable.from(Buffer.from('%PDF-test-stream')),
    contentType: 'application/pdf',
    contentLength: 16
  });
  const document = await service.attachVehicleDocument({
    actor: truckOwner,
    vehicleId: vehicle.id,
    input: {
      type: 'vehicle_registration',
      fileId: uploaded.id
    }
  });

  const preview = await service.openAdminVehicleDocumentPreview({
    actor: admin,
    vehicleId: vehicle.id,
    documentId: document.id
  });
  const chunks = [];

  for await (const chunk of preview.stream) {
    chunks.push(Buffer.from(chunk));
  }

  assert.equal(preview.file.mimeType, 'application/pdf');
  assert.equal(preview.gridFile.length, 16);
  assert.equal(Buffer.concat(chunks).toString(), '%PDF-test-stream');
  assert.equal(auditLogRepository.entries.at(-1).action, 'vehicle.document.preview.streamed');

  const download = await service.openFileDownload({
    actor: admin,
    fileId: uploaded.id
  });

  assert.equal(download.gridFile.length, 16);
  assert.equal(auditLogRepository.entries.at(-1).action, 'file.download.streamed');
});

test('admin vehicle document preview rejects documents from another vehicle', async () => {
  const { service } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();
  const vehicleOne = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-PREVIEW-A'
    }
  });
  const vehicleTwo = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-PREVIEW-B'
    }
  });
  const intent = await service.createUploadIntent({
    actor: truckOwner,
    input: {
      vehicleId: vehicleOne.id,
      type: 'driver_license',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      originalFileName: 'license.pdf'
    }
  });

  await service.completeFileUpload({
    actor: truckOwner,
    fileId: intent.file.id,
    input: {
      uploadedSizeBytes: 4096
    }
  });
  const document = await service.attachVehicleDocument({
    actor: truckOwner,
    vehicleId: vehicleOne.id,
    input: {
      type: 'driver_license',
      fileId: intent.file.id
    }
  });

  await assert.rejects(
    () =>
      service.createAdminVehicleDocumentPreviewUrl({
        actor: admin,
        vehicleId: vehicleTwo.id,
        documentId: document.id
      }),
    (error) => error instanceof AppError && error.code === 'VEHICLE_DOCUMENT_NOT_FOUND'
  );
});

test('vehicle photo upload can be attached to pending vehicle', async () => {
  const { service } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();
  const vehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-PHOTO'
    }
  });

  const intent = await service.createUploadIntent({
    actor: truckOwner,
    input: {
      vehicleId: vehicle.id,
      type: 'vehicle_photo',
      mimeType: 'image/jpeg',
      sizeBytes: 4096,
      originalFileName: 'truck.jpg'
    }
  });

  const updated = await service.updateOwnerVehicle({
    actor: truckOwner,
    vehicleId: vehicle.id,
    input: {
      photo: {
        fileId: intent.file.id,
        previewUrl: 'file://truck.jpg'
      }
    }
  });

  assert.equal(intent.file.visibility, 'public');
  assert.equal(updated.photo.fileId, intent.file.id);
  assert.equal(updated.photo.previewUrl, 'file://truck.jpg');
});

test('file upload completion marks file metadata uploaded', async () => {
  const { service } = createService();
  const intent = await service.createUploadIntent({
    actor: truckOwner,
    input: {
      vehicleId: 'veh_001',
      type: 'insurance',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      originalFileName: 'insurance.pdf'
    }
  });

  const completed = await service.completeFileUpload({
    actor: truckOwner,
    fileId: intent.file.id,
    input: {
      checksum: 'sha256-local-test',
      uploadedSizeBytes: 4096
    }
  });

  assert.equal(completed.status, 'uploaded');
  assert.equal(completed.checksum, 'sha256-local-test');
});

test('admin vehicle status update requires reason for suspension and audits', async () => {
  const { service, auditLogRepository } = createService();
  const [vehicleClass] = await service.seedDefaultVehicleClasses();
  const vehicle = await service.createVehicle({
    actor: truckOwner,
    input: {
      vehicleClassId: vehicleClass.id,
      licensePlate: 'AA-77889'
    }
  });

  await assert.rejects(
    () =>
      service.updateAdminVehicleStatus({
        actor: admin,
        vehicleId: vehicle.id,
        input: {
          availabilityStatus: vehicleAvailabilityStatuses.suspended
        }
      }),
    (error) => error instanceof AppError && error.code === 'VEHICLE_STATUS_REASON_REQUIRED'
  );

  const suspended = await service.updateAdminVehicleStatus({
    actor: admin,
    vehicleId: vehicle.id,
    input: {
      availabilityStatus: vehicleAvailabilityStatuses.suspended,
      reason: 'Document review escalated.'
    }
  });

  assert.equal(suspended.availabilityStatus, vehicleAvailabilityStatuses.suspended);
  assert.equal(auditLogRepository.entries[0].action, 'vehicle.status.updated');
});

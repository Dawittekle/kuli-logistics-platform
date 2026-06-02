import {
  fileLinkedEntityTypes,
  roles,
  vehicleAvailabilityStatuses,
  vehicleDocumentTypes,
  verificationStatuses
} from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';
import { defaultVehicleClasses } from './default-vehicle-classes.mjs';
import { assertVehicleAvailabilityTransition } from './vehicle-state.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const supportedVehicleDocumentMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const supportedVehiclePhotoMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxVehicleDocumentSizeBytes = 10 * 1024 * 1024;
const vehiclePhotoUploadType = 'vehicle_photo';
const requiredDocumentTypes = [
  vehicleDocumentTypes.identity,
  vehicleDocumentTypes.driverLicense,
  vehicleDocumentTypes.vehicleRegistration,
  vehicleDocumentTypes.ownershipProof,
  vehicleDocumentTypes.insurance
];

const slugify = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeLicensePlate = (value) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

const toAdminFileMetadata = (file) => {
  if (!file) {
    return undefined;
  }

  return {
    id: file.id,
    originalFileName: file.originalFileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedSizeBytes: file.uploadedSizeBytes,
    status: file.status,
    storageProvider: file.storageProvider,
    visibility: file.visibility,
    completedAt: file.completedAt
  };
};

const assertTruckOwner = (user) => {
  if (user.role !== roles.truckOwner) {
    throw new AppError(403, 'TRUCK_OWNER_REQUIRED', 'Only truck owners can manage vehicles.');
  }
};

const assertAdmin = (user) => {
  if (user.role !== roles.admin) {
    throw new AppError(403, 'ADMIN_REQUIRED', 'Only admins can perform this vehicle registry action.');
  }
};

const assertAssistantOrAdmin = (user) => {
  if (![roles.assistant, roles.admin].includes(user.role)) {
    throw new AppError(403, 'ASSISTANT_REQUIRED', 'Only assistants or admins can inspect dispatch vehicles.');
  }
};

const assertOwnerVehicle = (vehicle, user) => {
  if (!vehicle) {
    throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found.');
  }

  if (vehicle.ownerId !== user.id) {
    throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found.');
  }
};

export class VehicleRegistryService {
  constructor({
    vehicleClassRepository,
    vehicleRepository,
    vehicleDocumentRepository,
    fileRepository,
    auditLogRepository,
    userRepository
  }) {
    this.vehicleClassRepository = vehicleClassRepository;
    this.vehicleRepository = vehicleRepository;
    this.vehicleDocumentRepository = vehicleDocumentRepository;
    this.fileRepository = fileRepository;
    this.auditLogRepository = auditLogRepository;
    this.userRepository = userRepository;
  }

  async seedDefaultVehicleClasses() {
    const seeded = [];

    for (const vehicleClass of defaultVehicleClasses) {
      const existing = await this.vehicleClassRepository.findBySlug(vehicleClass.slug);

      if (existing) {
        seeded.push(existing);
        continue;
      }

      seeded.push(
        await this.vehicleClassRepository.save({
          id: `vcls_${vehicleClass.slug}`,
          ...vehicleClass
        })
      );
    }

    return seeded;
  }

  async listActiveVehicleClasses() {
    return this.vehicleClassRepository.listActive();
  }

  async listAdminVehicleClasses({ actor }) {
    assertAdmin(actor);
    return this.vehicleClassRepository.listForAdmin();
  }

  async hydrateAdminVehicleDocuments(vehicle) {
    const documents = await this.vehicleDocumentRepository.listByVehicleId(vehicle.id);

    return Promise.all(
      documents.map(async (document) => ({
        ...document,
        file: toAdminFileMetadata(await this.fileRepository.findById(document.fileId))
      }))
    );
  }

  async createVehicleClass({ actor, input }) {
    assertAdmin(actor);

    if (!input.name) {
      throw new AppError(400, 'VEHICLE_CLASS_NAME_REQUIRED', 'Vehicle class name is required.');
    }

    const slug = slugify(input.slug ?? input.name);

    if (!slug) {
      throw new AppError(400, 'VEHICLE_CLASS_SLUG_REQUIRED', 'Vehicle class slug is required.');
    }

    if (input.capacityKg !== undefined && input.capacityKg <= 0) {
      throw new AppError(422, 'INVALID_VEHICLE_CLASS_CAPACITY', 'Vehicle class capacity must be positive.');
    }

    return this.vehicleClassRepository.save({
      id: `vcls_${slug}`,
      slug,
      name: input.name,
      description: input.description,
      capacityKg: input.capacityKg,
      capacityCubicMeters: input.capacityCubicMeters,
      dimensions: input.dimensions,
      defaultPricing: input.defaultPricing ?? {
        baseFare: 0,
        perKmRate: 0,
        minimumFare: 0
      },
      active: input.active ?? true,
      displayOrder: input.displayOrder ?? 100
    });
  }

  async updateVehicleClass({ actor, vehicleClassId, input }) {
    assertAdmin(actor);

    const vehicleClass = await this.vehicleClassRepository.findById(vehicleClassId);

    if (!vehicleClass) {
      throw new AppError(404, 'VEHICLE_CLASS_NOT_FOUND', 'Vehicle class was not found.');
    }

    const update = {
      ...vehicleClass,
      name: input.name ?? vehicleClass.name,
      description: input.description ?? vehicleClass.description,
      capacityKg: input.capacityKg ?? vehicleClass.capacityKg,
      capacityCubicMeters: input.capacityCubicMeters ?? vehicleClass.capacityCubicMeters,
      dimensions: input.dimensions ?? vehicleClass.dimensions,
      defaultPricing: input.defaultPricing ?? vehicleClass.defaultPricing,
      active: input.active ?? vehicleClass.active,
      displayOrder: input.displayOrder ?? vehicleClass.displayOrder
    };

    if (input.deletedAt !== undefined || vehicleClass.deletedAt) {
      update.deletedAt = input.deletedAt ?? vehicleClass.deletedAt;
    }

    return this.vehicleClassRepository.save(update);
  }

  async deactivateVehicleClass({ actor, vehicleClassId }) {
    return this.updateVehicleClass({
      actor,
      vehicleClassId,
      input: {
        active: false,
        deletedAt: new Date().toISOString()
      }
    });
  }

  async createVehicle({ actor, input }) {
    assertTruckOwner(actor);

    const vehicleClass = await this.vehicleClassRepository.findById(input.vehicleClassId);

    if (!vehicleClass || !vehicleClass.active) {
      throw new AppError(422, 'VEHICLE_CLASS_NOT_AVAILABLE', 'Selected vehicle class is not available.');
    }

    const licensePlate = normalizeLicensePlate(input.licensePlate);

    if (!licensePlate) {
      throw new AppError(400, 'LICENSE_PLATE_REQUIRED', 'License plate is required.');
    }

    return this.vehicleRepository.save({
      id: createId('veh'),
      ownerId: actor.id,
      vehicleClassId: vehicleClass.id,
      vehicleClassSnapshot: {
        slug: vehicleClass.slug,
        name: vehicleClass.name
      },
      licensePlate,
      capacityKg: input.capacityKg,
      capacityCubicMeters: input.capacityCubicMeters,
      description: input.description,
      verificationStatus: verificationStatuses.pending,
      verificationSubmittedAt: new Date().toISOString(),
      availabilityStatus: vehicleAvailabilityStatuses.offline,
      currentLocation: input.currentLocation,
      currentLocationUpdatedAt: input.currentLocation ? new Date().toISOString() : undefined,
      documentsRequired: requiredDocumentTypes
    });
  }

  async listOwnerVehicles({ actor }) {
    assertTruckOwner(actor);
    return this.vehicleRepository.listByOwnerId(actor.id);
  }

  async getOwnerVehicle({ actor, vehicleId }) {
    assertTruckOwner(actor);
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    assertOwnerVehicle(vehicle, actor);

    return {
      ...vehicle,
      documents: await this.vehicleDocumentRepository.listByVehicleId(vehicle.id)
    };
  }

  async getAdminVehicle({ actor, vehicleId }) {
    assertAdmin(actor);

    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found.');
    }

    return {
      ...vehicle,
      documents: await this.hydrateAdminVehicleDocuments(vehicle)
    };
  }

  async updateOwnerVehicle({ actor, vehicleId, input }) {
    assertTruckOwner(actor);
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    assertOwnerVehicle(vehicle, actor);

    if (vehicle.verificationStatus === verificationStatuses.approved) {
      throw new AppError(422, 'APPROVED_VEHICLE_LOCKED', 'Approved vehicle details require admin review before changes.');
    }

    let photo = vehicle.photo;

    if (input.photo) {
      const file = await this.fileRepository.findById(input.photo.fileId);

      if (!file || file.ownerId !== actor.id) {
        throw new AppError(404, 'FILE_NOT_FOUND', 'Vehicle photo metadata was not found.');
      }

      photo = {
        fileId: file.id,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        previewUrl: input.photo.previewUrl
      };
    }

    return this.vehicleRepository.save({
      ...vehicle,
      licensePlate: input.licensePlate ? normalizeLicensePlate(input.licensePlate) : vehicle.licensePlate,
      capacityKg: input.capacityKg ?? vehicle.capacityKg,
      capacityCubicMeters: input.capacityCubicMeters ?? vehicle.capacityCubicMeters,
      description: input.description ?? vehicle.description,
      photo,
      currentLocation: input.currentLocation ?? vehicle.currentLocation,
      currentLocationUpdatedAt: input.currentLocation ? new Date().toISOString() : vehicle.currentLocationUpdatedAt,
      verificationStatus: verificationStatuses.pending,
      verificationSubmittedAt: new Date().toISOString()
    });
  }

  async createUploadIntent({ actor, input }) {
    assertTruckOwner(actor);

    const isVehiclePhoto = input.type === vehiclePhotoUploadType;

    if (!isVehiclePhoto && !Object.values(vehicleDocumentTypes).includes(input.type)) {
      throw new AppError(422, 'INVALID_DOCUMENT_TYPE', 'Unsupported vehicle document type.');
    }

    const allowedMimeTypes = isVehiclePhoto ? supportedVehiclePhotoMimeTypes : supportedVehicleDocumentMimeTypes;

    if (!allowedMimeTypes.includes(input.mimeType)) {
      throw new AppError(422, 'DOCUMENT_UPLOAD_INVALID', isVehiclePhoto ? 'Vehicle photo must be an image.' : 'Vehicle documents must be an image or PDF.', {
        mimeType: input.mimeType
      });
    }

    if (!input.sizeBytes || input.sizeBytes <= 0 || input.sizeBytes > maxVehicleDocumentSizeBytes) {
      throw new AppError(422, 'DOCUMENT_UPLOAD_INVALID', 'Vehicle document file size is invalid.', {
        maxSizeBytes: maxVehicleDocumentSizeBytes
      });
    }

    const fileId = createId('file');
    const originalFileName = input.originalFileName ?? `${input.type}`;

    const file = await this.fileRepository.save({
      id: fileId,
      ownerId: actor.id,
      linkedEntityType: fileLinkedEntityTypes.vehicle,
      linkedEntityId: input.vehicleId,
      storageProvider: 'local_dev',
      storageKey: `local-dev/${isVehiclePhoto ? 'vehicle-photos' : 'vehicle-documents'}/${actor.id}/${fileId}-${originalFileName}`,
      originalFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: isVehiclePhoto ? 'public' : 'staff_only'
    });

    return {
      file,
      upload: {
        method: 'PUT',
        url: `local-dev://uploads/${file.storageKey}`,
        expiresInSeconds: 900
      }
    };
  }

  async createSignedFileUrl({ actor, fileId }) {
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File metadata was not found.');
    }

    if (actor.role === roles.truckOwner && file.ownerId !== actor.id) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File metadata was not found.');
    }

    if (![roles.admin, roles.truckOwner].includes(actor.role)) {
      throw new AppError(403, 'FILE_ACCESS_FORBIDDEN', 'You do not have access to this file.');
    }

    if (actor.role === roles.admin) {
      await this.auditLogRepository.write({
        id: createId('audit'),
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'file.signed_url.created',
        targetType: 'file',
        targetId: file.id,
        metadata: {
          linkedEntityType: file.linkedEntityType,
          linkedEntityId: file.linkedEntityId
        }
      });
    }

    return {
      fileId: file.id,
      url: `local-dev://signed-read/${file.storageKey}`,
      expiresInSeconds: 300
    };
  }

  async createAdminVehicleDocumentPreviewUrl({ actor, vehicleId, documentId }) {
    assertAdmin(actor);

    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found.');
    }

    const document = await this.vehicleDocumentRepository.findById(documentId);

    if (!document || document.vehicleId !== vehicle.id || document.ownerId !== vehicle.ownerId) {
      throw new AppError(404, 'VEHICLE_DOCUMENT_NOT_FOUND', 'Vehicle document was not found.');
    }

    const file = await this.fileRepository.findById(document.fileId);

    if (
      !file ||
      file.linkedEntityType !== fileLinkedEntityTypes.vehicle ||
      file.linkedEntityId !== vehicle.id ||
      file.ownerId !== vehicle.ownerId ||
      file.visibility !== 'staff_only'
    ) {
      throw new AppError(404, 'VEHICLE_DOCUMENT_FILE_NOT_FOUND', 'Vehicle document file metadata was not found.');
    }

    if (file.status !== 'uploaded') {
      throw new AppError(422, 'VEHICLE_DOCUMENT_FILE_NOT_READY', 'Vehicle document upload has not been completed yet.');
    }

    await this.auditLogRepository.write({
      id: createId('audit'),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'vehicle.document.preview_url.created',
      targetType: 'vehicle_document',
      targetId: document.id,
      metadata: {
        vehicleId: vehicle.id,
        fileId: file.id,
        documentType: document.type,
        storageProvider: file.storageProvider
      }
    });

    return {
      vehicleId: vehicle.id,
      documentId: document.id,
      fileId: file.id,
      url: `local-dev://signed-read/${file.storageKey}`,
      expiresInSeconds: 300,
      file: toAdminFileMetadata(file)
    };
  }

  async completeFileUpload({ actor, fileId, input = {} }) {
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File metadata was not found.');
    }

    if (actor.role !== roles.admin && file.ownerId !== actor.id) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File metadata was not found.');
    }

    if (![roles.truckOwner, roles.admin].includes(actor.role)) {
      throw new AppError(403, 'FILE_ACCESS_FORBIDDEN', 'You do not have access to this file.');
    }

    return this.fileRepository.complete({
      fileId,
      update: {
        checksum: input.checksum,
        uploadedSizeBytes: input.uploadedSizeBytes
      }
    });
  }

  async attachVehicleDocument({ actor, vehicleId, input }) {
    assertTruckOwner(actor);
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    assertOwnerVehicle(vehicle, actor);

    const file = await this.fileRepository.findById(input.fileId);

    if (!file || file.ownerId !== actor.id) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'File metadata was not found.');
    }

    if (!Object.values(vehicleDocumentTypes).includes(input.type)) {
      throw new AppError(422, 'INVALID_DOCUMENT_TYPE', 'Unsupported vehicle document type.');
    }

    return this.vehicleDocumentRepository.save({
      id: createId('vdoc'),
      vehicleId: vehicle.id,
      ownerId: actor.id,
      type: input.type,
      fileId: file.id,
      status: 'uploaded'
    });
  }

  async updateAvailability({ actor, vehicleId, input }) {
    assertTruckOwner(actor);
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    assertOwnerVehicle(vehicle, actor);

    assertVehicleAvailabilityTransition({
      vehicle,
      nextAvailabilityStatus: input.availabilityStatus
    });

    return this.vehicleRepository.save({
      ...vehicle,
      availabilityStatus: input.availabilityStatus,
      currentLocation: input.currentLocation ?? vehicle.currentLocation,
      currentLocationUpdatedAt: input.currentLocation ? new Date().toISOString() : vehicle.currentLocationUpdatedAt
    });
  }

  async listPendingVerification({ actor }) {
    assertAdmin(actor);
    return this.vehicleRepository.listPendingVerification();
  }

  async listAdminVehicles({ actor, filters = {} }) {
    assertAdmin(actor);

    const vehicles = await this.vehicleRepository.listForAdmin(filters);

    return Promise.all(
      vehicles.map(async (vehicle) => ({
        ...vehicle,
        documents: await this.hydrateAdminVehicleDocuments(vehicle)
      }))
    );
  }

  async listAssistantVehicles({ actor, filters = {} }) {
    assertAssistantOrAdmin(actor);

    const vehicles = await this.vehicleRepository.listForAdmin(filters);

    return Promise.all(
      vehicles.map(async (vehicle) => {
        const owner = this.userRepository ? await this.userRepository.findById(vehicle.ownerId) : null;

        return {
          ...vehicle,
          owner: owner
            ? {
                id: owner.id,
                fullName: owner.fullName,
                email: owner.email,
                phone: owner.phone,
                accountStatus: owner.accountStatus
              }
            : undefined
        };
      })
    );
  }

  async decideVerification({ actor, vehicleId, input }) {
    assertAdmin(actor);

    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found.');
    }

    if (![verificationStatuses.approved, verificationStatuses.rejected].includes(input.verificationStatus)) {
      throw new AppError(422, 'INVALID_VERIFICATION_STATUS', 'Admin verification must approve or reject the vehicle.');
    }

    if (input.verificationStatus === verificationStatuses.rejected && !input.reason) {
      throw new AppError(422, 'REJECTION_REASON_REQUIRED', 'A rejection reason is required.');
    }

    const updatedVehicle = await this.vehicleRepository.save({
      ...vehicle,
      verificationStatus: input.verificationStatus,
      verifiedAt: new Date().toISOString(),
      verifiedByAdminId: actor.id,
      rejectionReason: input.verificationStatus === verificationStatuses.rejected ? input.reason : undefined,
      availabilityStatus:
        input.verificationStatus === verificationStatuses.rejected
          ? vehicleAvailabilityStatuses.offline
          : vehicle.availabilityStatus
    });

    await this.auditLogRepository.write({
      id: createId('audit'),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: input.verificationStatus === verificationStatuses.approved ? 'vehicle.approved' : 'vehicle.rejected',
      targetType: 'vehicle',
      targetId: vehicle.id,
      metadata: {
        reason: input.reason,
        priorVerificationStatus: vehicle.verificationStatus
      }
    });

    return updatedVehicle;
  }

  async updateAdminVehicleStatus({ actor, vehicleId, input }) {
    assertAdmin(actor);

    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle was not found.');
    }

    if (!Object.values(vehicleAvailabilityStatuses).includes(input.availabilityStatus)) {
      throw new AppError(422, 'INVALID_AVAILABILITY_STATUS', 'Unknown vehicle availability status.');
    }

    if (input.availabilityStatus === vehicleAvailabilityStatuses.suspended && !input.reason) {
      throw new AppError(422, 'VEHICLE_STATUS_REASON_REQUIRED', 'Suspending a vehicle requires a reason.');
    }

    const updatedVehicle = await this.vehicleRepository.save({
      ...vehicle,
      availabilityStatus: input.availabilityStatus,
      adminStatusReason: input.reason,
      adminStatusUpdatedAt: new Date().toISOString(),
      adminStatusUpdatedById: actor.id
    });

    await this.auditLogRepository.write({
      id: createId('audit'),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'vehicle.status.updated',
      targetType: 'vehicle',
      targetId: vehicle.id,
      metadata: {
        priorAvailabilityStatus: vehicle.availabilityStatus,
        nextAvailabilityStatus: input.availabilityStatus,
        reason: input.reason
      }
    });

    return updatedVehicle;
  }
}

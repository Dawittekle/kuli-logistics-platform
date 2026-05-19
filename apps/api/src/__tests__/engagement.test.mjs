import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kuliStatuses,
  paymentStatuses,
  reportCategories,
  reportResolutionOutcomes,
  reportStatuses,
  roles
} from '../../../../packages/shared/src/index.mjs';
import { AppError } from '../common/errors/app-error.mjs';
import { EngagementService } from '../modules/engagement/engagement-service.mjs';

const client = {
  id: 'usr_client_001',
  role: roles.client
};

const owner = {
  id: 'usr_owner_001',
  role: roles.truckOwner
};

const admin = {
  id: 'usr_admin_001',
  role: roles.admin
};

const completedRequest = {
  id: 'kreq_completed_001',
  requestCode: 'KULI-COMPLETE-001',
  clientId: client.id,
  selectedOwnerId: owner.id,
  selectedVehicleId: 'veh_001',
  status: kuliStatuses.completed,
  quoteSnapshot: {
    currency: 'ETB',
    totalEstimate: 2400
  }
};

class MemoryKuliRequestRepository {
  constructor() {
    this.records = new Map([
      [
        completedRequest.id,
        completedRequest
      ],
      [
        'kreq_accepted_001',
        {
          ...completedRequest,
          id: 'kreq_accepted_001',
          status: kuliStatuses.accepted
        }
      ]
    ]);
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }
}

class MemoryPaymentRepository {
  constructor() {
    this.records = new Map();
  }

  async findByRequestId(requestId) {
    return Array.from(this.records.values()).find((payment) => payment.requestId === requestId) ?? null;
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async save(payment) {
    const saved = {
      ...payment,
      createdAt: payment.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.records.set(saved.id, saved);
    return saved;
  }

  async list() {
    return Array.from(this.records.values());
  }
}

class MemoryRatingRepository {
  constructor() {
    this.records = new Map();
  }

  async findByRequestRaterAndOwner({ requestId, raterId, targetOwnerId }) {
    return (
      Array.from(this.records.values()).find(
        (rating) => rating.requestId === requestId && rating.raterId === raterId && rating.targetOwnerId === targetOwnerId
      ) ?? null
    );
  }

  async save(rating) {
    const saved = {
      ...rating,
      createdAt: rating.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.records.set(saved.id, saved);
    return saved;
  }

  async listByOwnerId(targetOwnerId) {
    return Array.from(this.records.values()).filter((rating) => rating.targetOwnerId === targetOwnerId);
  }
}

class MemoryReportRepository {
  constructor() {
    this.records = new Map();
  }

  async save(report) {
    const saved = {
      ...report,
      createdAt: report.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.records.set(saved.id, saved);
    return saved;
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async list(filters = {}) {
    return Array.from(this.records.values()).filter((report) =>
      Object.entries(filters)
        .filter(([, value]) => value)
        .every(([key, value]) => report[key] === value)
    );
  }
}

class MemoryUserRepository {
  constructor() {
    this.records = new Map([
      [
        owner.id,
        {
          id: owner.id,
          role: roles.truckOwner,
          truckOwnerMeta: {
            averageRating: 0,
            ratingCount: 0,
            visibilityPenaltyScore: 0
          }
        }
      ]
    ]);
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async save(user) {
    this.records.set(user.id, user);
    return user;
  }
}

class MemoryAuditLogRepository {
  constructor() {
    this.records = [];
  }

  async write(entry) {
    this.records.push(entry);
    return entry;
  }
}

const createService = () => {
  const paymentRepository = new MemoryPaymentRepository();
  const ratingRepository = new MemoryRatingRepository();
  const reportRepository = new MemoryReportRepository();
  const userRepository = new MemoryUserRepository();
  const auditLogRepository = new MemoryAuditLogRepository();
  const service = new EngagementService({
    kuliRequestRepository: new MemoryKuliRequestRepository(),
    paymentRepository,
    ratingRepository,
    reportRepository,
    userRepository,
    auditLogRepository
  });

  return {
    service,
    paymentRepository,
    ratingRepository,
    reportRepository,
    userRepository,
    auditLogRepository
  };
};

test('payment confirmation is blocked before completion and allowed after completion', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.confirmPayment({
        actor: owner,
        requestId: 'kreq_accepted_001',
        input: {}
      }),
    (error) => error instanceof AppError && error.code === 'PAYMENT_CONFIRM_REQUIRES_COMPLETED_TRIP'
  );

  const confirmed = await service.confirmPayment({
    actor: owner,
    requestId: completedRequest.id,
    input: {
      amountConfirmed: 2400
    }
  });

  assert.equal(confirmed.payment.status, paymentStatuses.confirmedByOwner);
  assert.equal(confirmed.payment.amountExpected, 2400);
  assert.equal(confirmed.payment.confirmedByOwnerId, owner.id);
});

test('client can dispute payment and admin resolution requires note and audit log', async () => {
  const { service, auditLogRepository } = createService();
  const disputed = await service.disputePayment({
    actor: client,
    requestId: completedRequest.id,
    input: {
      disputeReason: 'Owner asked for more than the estimate.'
    }
  });

  await assert.rejects(
    () =>
      service.resolvePayment({
        actor: admin,
        paymentId: disputed.payment.id,
        input: {}
      }),
    (error) => error instanceof AppError && error.code === 'PAYMENT_RESOLUTION_NOTE_REQUIRED'
  );

  const resolved = await service.resolvePayment({
    actor: admin,
    paymentId: disputed.payment.id,
    input: {
      resolutionNote: 'Confirmed estimate with both parties.',
      amountConfirmed: 2400
    }
  });

  assert.equal(resolved.status, paymentStatuses.resolved);
  assert.equal(auditLogRepository.records.at(-1).action, 'payment.resolved');
});

test('rating is terminal-only and duplicate rating is rejected while aggregate updates', async () => {
  const { service, userRepository } = createService();

  await assert.rejects(
    () =>
      service.submitRating({
        actor: client,
        requestId: 'kreq_accepted_001',
        input: {
          rating: 5
        }
      }),
    (error) => error instanceof AppError && error.code === 'RATING_REQUIRES_TERMINAL_TRIP'
  );

  const rating = await service.submitRating({
    actor: client,
    requestId: completedRequest.id,
    input: {
      rating: 4,
      reviewText: 'Good job and careful unloading.'
    }
  });
  const updatedOwner = await userRepository.findById(owner.id);

  assert.equal(rating.rating, 4);
  assert.equal(updatedOwner.truckOwnerMeta.averageRating, 4);
  assert.equal(updatedOwner.truckOwnerMeta.ratingCount, 1);

  await assert.rejects(
    () =>
      service.submitRating({
        actor: client,
        requestId: completedRequest.id,
        input: {
          rating: 5
        }
      }),
    (error) => error instanceof AppError && error.code === 'RATING_ALREADY_EXISTS'
  );
});

test('report evidence and admin resolution require reason and apply visibility penalty', async () => {
  const { service, userRepository, auditLogRepository } = createService();
  const report = await service.createReport({
    actor: client,
    input: {
      requestId: completedRequest.id,
      category: reportCategories.damage,
      description: 'A table was damaged during unloading.'
    }
  });
  const withEvidence = await service.addReportEvidence({
    actor: client,
    reportId: report.id,
    input: {
      evidenceFileIds: ['file_damage_001']
    }
  });

  await assert.rejects(
    () =>
      service.resolveReport({
        actor: admin,
        reportId: report.id,
        input: {
          outcome: reportResolutionOutcomes.visibilityPenalty
        }
      }),
    (error) => error instanceof AppError && error.code === 'REPORT_RESOLUTION_NOTE_REQUIRED'
  );

  const resolved = await service.resolveReport({
    actor: admin,
    reportId: report.id,
    input: {
      outcome: reportResolutionOutcomes.visibilityPenalty,
      note: 'Evidence supports a visibility penalty.'
    }
  });
  const updatedOwner = await userRepository.findById(owner.id);

  assert.equal(withEvidence.evidenceFileIds.length, 1);
  assert.equal(resolved.status, reportStatuses.resolved);
  assert.equal(updatedOwner.truckOwnerMeta.visibilityPenaltyScore, 5);
  assert.equal(auditLogRepository.records.at(-1).action, 'report.resolved');
});

test('platform issue report can be created without request', async () => {
  const { service } = createService();
  const report = await service.createReport({
    actor: client,
    input: {
      category: reportCategories.platformIssue,
      description: 'The app showed the wrong notification state.'
    }
  });

  assert.equal(report.status, reportStatuses.open);
  assert.equal(report.requestId, undefined);
});

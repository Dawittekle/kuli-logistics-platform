import {
  kuliStatuses,
  paymentFlows,
  paymentMethods,
  paymentStatuses,
  ratingModerationStatuses,
  reportCategories,
  reportResolutionOutcomes,
  reportStatuses,
  roles
} from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const reportCode = () => `REP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const terminalRatingStatuses = [kuliStatuses.completed, kuliStatuses.cancelled];

const assertAdmin = (actor) => {
  if (actor.role !== roles.admin) {
    throw new AppError(403, 'ADMIN_REQUIRED', 'Only admins can perform this action.');
  }
};

const assertClientOrAssistant = (actor) => {
  if (![roles.client, roles.assistant, roles.admin].includes(actor.role)) {
    throw new AppError(403, 'CLIENT_OR_ASSISTANT_REQUIRED', 'Only clients, assistants, or admins can perform this action.');
  }
};

export class EngagementService {
  constructor({
    kuliRequestRepository,
    paymentRepository,
    ratingRepository,
    reportRepository,
    userRepository,
    auditLogRepository
  }) {
    this.kuliRequestRepository = kuliRequestRepository;
    this.paymentRepository = paymentRepository;
    this.ratingRepository = ratingRepository;
    this.reportRepository = reportRepository;
    this.userRepository = userRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async ensurePaymentRecord(request) {
    const existing = await this.paymentRepository.findByRequestId(request.id);

    if (existing) {
      return existing;
    }

    if (!request.selectedOwnerId) {
      throw new AppError(409, 'PAYMENT_NOT_AVAILABLE', 'Payment record requires an accepted owner.');
    }

    return this.paymentRepository.save({
      id: createId('pay'),
      requestId: request.id,
      payerClientId: request.clientId,
      payeeOwnerId: request.selectedOwnerId,
      status: paymentStatuses.pending,
      flow: paymentFlows.payOnDelivery,
      method: paymentMethods.cash,
      currency: request.quoteSnapshot?.currency ?? 'ETB',
      amountExpected: request.quoteSnapshot?.totalEstimate ?? 0,
      platformCommissionAmount: 0
    });
  }

  async confirmPayment({ actor, requestId, input = {} }) {
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    if (actor.role !== roles.truckOwner || request.selectedOwnerId !== actor.id) {
      throw new AppError(403, 'PAYMENT_CONFIRM_FORBIDDEN', 'Only the assigned truck owner can confirm payment.');
    }

    if (request.status !== kuliStatuses.completed) {
      throw new AppError(409, 'PAYMENT_CONFIRM_REQUIRES_COMPLETED_TRIP', 'Payment can be confirmed only after completion.');
    }

    const payment = await this.ensurePaymentRecord(request);

    if (payment.status === paymentStatuses.confirmedByOwner) {
      return {
        payment,
        idempotentReplay: true
      };
    }

    if (payment.status === paymentStatuses.resolved) {
      throw new AppError(409, 'PAYMENT_ALREADY_RESOLVED', 'Resolved payments cannot be confirmed again.');
    }

    return {
      payment: await this.paymentRepository.save({
        ...payment,
        status: paymentStatuses.confirmedByOwner,
        amountConfirmed: input.amountConfirmed ?? payment.amountExpected,
        confirmedByOwnerId: actor.id,
        confirmedAt: new Date().toISOString()
      })
    };
  }

  async disputePayment({ actor, requestId, input }) {
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request || request.clientId !== actor.id) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    if (![kuliStatuses.completed, kuliStatuses.cancelled].includes(request.status)) {
      throw new AppError(409, 'PAYMENT_DISPUTE_REQUIRES_TERMINAL_TRIP', 'Payment can be disputed only after trip completion or cancellation.');
    }

    const reason = typeof input.disputeReason === 'string' ? input.disputeReason.trim() : '';

    if (!reason) {
      throw new AppError(422, 'PAYMENT_DISPUTE_REASON_REQUIRED', 'Payment dispute reason is required.');
    }

    const payment = await this.ensurePaymentRecord(request);

    if (payment.status === paymentStatuses.resolved) {
      throw new AppError(409, 'PAYMENT_ALREADY_RESOLVED', 'Resolved payments cannot be disputed.');
    }

    return {
      payment: await this.paymentRepository.save({
        ...payment,
        status: paymentStatuses.disputed,
        disputedByUserId: actor.id,
        disputeReason: reason
      })
    };
  }

  async listPayments({ actor }) {
    assertAdmin(actor);
    return this.paymentRepository.list();
  }

  async resolvePayment({ actor, paymentId, input }) {
    assertAdmin(actor);
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment was not found.');
    }

    const resolutionNote = typeof input.resolutionNote === 'string' ? input.resolutionNote.trim() : '';

    if (!resolutionNote) {
      throw new AppError(422, 'PAYMENT_RESOLUTION_NOTE_REQUIRED', 'Payment resolution requires a note.');
    }

    const resolved = await this.paymentRepository.save({
      ...payment,
      status: paymentStatuses.resolved,
      amountConfirmed: input.amountConfirmed ?? payment.amountConfirmed ?? payment.amountExpected,
      resolvedByAdminId: actor.id,
      resolutionNote
    });

    await this.auditLogRepository.write({
      id: createId('audit'),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'payment.resolved',
      targetType: 'payment',
      targetId: payment.id,
      metadata: {
        requestId: payment.requestId,
        resolutionNote
      }
    });

    return resolved;
  }

  async submitRating({ actor, requestId, input }) {
    assertClientOrAssistant(actor);
    const request = await this.kuliRequestRepository.findById(requestId);

    if (!request) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    const actorCanRate =
      (actor.role === roles.client && request.clientId === actor.id) ||
      (actor.role === roles.assistant && request.createdByAssistantId === actor.id) ||
      actor.role === roles.admin;

    if (!actorCanRate) {
      throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
    }

    if (!terminalRatingStatuses.includes(request.status) || !request.selectedOwnerId) {
      throw new AppError(409, 'RATING_REQUIRES_TERMINAL_TRIP', 'Rating requires a completed or accepted-then-cancelled trip.');
    }

    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new AppError(422, 'INVALID_RATING', 'Rating must be an integer between 1 and 5.');
    }

    const existing = await this.ratingRepository.findByRequestRaterAndOwner({
      requestId: request.id,
      raterId: actor.id,
      targetOwnerId: request.selectedOwnerId
    });

    if (existing) {
      throw new AppError(409, 'RATING_ALREADY_EXISTS', 'This trip already has a rating from this rater.');
    }

    const rating = await this.ratingRepository.save({
      id: createId('rating'),
      requestId: request.id,
      raterId: actor.id,
      targetOwnerId: request.selectedOwnerId,
      targetVehicleId: request.selectedVehicleId,
      rating: input.rating,
      reviewText: input.reviewText,
      moderationStatus: ratingModerationStatuses.visible
    });

    await this.recalculateOwnerRating(request.selectedOwnerId);

    return rating;
  }

  async listOwnerRatings({ ownerId }) {
    return this.ratingRepository.listByOwnerId(ownerId);
  }

  async recalculateOwnerRating(ownerId) {
    const owner = await this.userRepository.findById(ownerId);

    if (!owner) {
      return null;
    }

    const ratings = (await this.ratingRepository.listByOwnerId(ownerId)).filter(
      (rating) => rating.moderationStatus === ratingModerationStatuses.visible
    );
    const ratingCount = ratings.length;
    const averageRating =
      ratingCount === 0
        ? 0
        : Number((ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratingCount).toFixed(2));

    return this.userRepository.save({
      ...owner,
      truckOwnerMeta: {
        ...owner.truckOwnerMeta,
        averageRating,
        ratingCount
      }
    });
  }

  async createReport({ actor, input }) {
    assertClientOrAssistant(actor);

    if (!Object.values(reportCategories).includes(input.category)) {
      throw new AppError(422, 'INVALID_REPORT_CATEGORY', 'Unknown report category.');
    }

    const description = typeof input.description === 'string' ? input.description.trim() : '';

    if (!description) {
      throw new AppError(422, 'REPORT_DESCRIPTION_REQUIRED', 'Report description is required.');
    }

    let request = null;

    if (input.requestId) {
      request = await this.kuliRequestRepository.findById(input.requestId);
      const canReport =
        request &&
        (request.clientId === actor.id ||
          request.createdByAssistantId === actor.id ||
          request.selectedOwnerId === actor.id ||
          actor.role === roles.admin);

      if (!canReport) {
        throw new AppError(404, 'KULI_REQUEST_NOT_FOUND', 'KULI request was not found.');
      }
    } else if (input.category !== reportCategories.platformIssue) {
      throw new AppError(422, 'REPORT_REQUEST_REQUIRED', 'Reports without a request must use platform_issue category.');
    }

    return this.reportRepository.save({
      id: createId('report'),
      reportCode: reportCode(),
      requestId: request?.id,
      reporterId: actor.id,
      reportedUserId: input.reportedUserId ?? request?.selectedOwnerId,
      reportedVehicleId: input.reportedVehicleId ?? request?.selectedVehicleId,
      category: input.category,
      description,
      evidenceFileIds: input.evidenceFileIds ?? [],
      status: reportStatuses.open
    });
  }

  async addReportEvidence({ actor, reportId, input }) {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new AppError(404, 'REPORT_NOT_FOUND', 'Report was not found.');
    }

    const canEdit = report.reporterId === actor.id || [roles.assistant, roles.admin].includes(actor.role);

    if (!canEdit) {
      throw new AppError(403, 'REPORT_EVIDENCE_FORBIDDEN', 'Only the reporter or staff can add report evidence.');
    }

    const evidenceFileIds = input.evidenceFileIds ?? (input.fileId ? [input.fileId] : []);

    if (evidenceFileIds.length === 0) {
      throw new AppError(422, 'REPORT_EVIDENCE_REQUIRED', 'At least one evidence file id is required.');
    }

    return this.reportRepository.save({
      ...report,
      evidenceFileIds: [...new Set([...(report.evidenceFileIds ?? []), ...evidenceFileIds])]
    });
  }

  async listReports({ actor, filters }) {
    assertAdmin(actor);
    return this.reportRepository.list(filters);
  }

  async resolveReport({ actor, reportId, input }) {
    assertAdmin(actor);
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new AppError(404, 'REPORT_NOT_FOUND', 'Report was not found.');
    }

    if (!Object.values(reportResolutionOutcomes).includes(input.outcome)) {
      throw new AppError(422, 'INVALID_REPORT_OUTCOME', 'Unknown report resolution outcome.');
    }

    const note = typeof input.note === 'string' ? input.note.trim() : '';

    if (!note) {
      throw new AppError(422, 'REPORT_RESOLUTION_NOTE_REQUIRED', 'Report resolution requires a note.');
    }

    const resolved = await this.reportRepository.save({
      ...report,
      status: input.outcome === reportResolutionOutcomes.rejected ? reportStatuses.rejected : reportStatuses.resolved,
      assignedAdminId: actor.id,
      resolution: {
        outcome: input.outcome,
        note,
        resolvedByAdminId: actor.id,
        resolvedAt: new Date().toISOString()
      }
    });

    if (input.outcome === reportResolutionOutcomes.visibilityPenalty && report.reportedUserId) {
      await this.applyVisibilityPenalty(report.reportedUserId);
    }

    await this.auditLogRepository.write({
      id: createId('audit'),
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'report.resolved',
      targetType: 'report',
      targetId: report.id,
      metadata: {
        outcome: input.outcome,
        note
      }
    });

    return resolved;
  }

  async applyVisibilityPenalty(ownerId) {
    const owner = await this.userRepository.findById(ownerId);

    if (!owner) {
      return null;
    }

    return this.userRepository.save({
      ...owner,
      truckOwnerMeta: {
        ...owner.truckOwnerMeta,
        visibilityPenaltyScore: (owner.truckOwnerMeta?.visibilityPenaltyScore ?? 0) + 5
      }
    });
  }
}

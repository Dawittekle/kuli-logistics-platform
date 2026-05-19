import { roles } from '../../../../../packages/shared/src/index.mjs';
import { AppError } from '../../common/errors/app-error.mjs';
import { validateRuntimeConfig } from '../../config/release-readiness.mjs';

const assertAdmin = (actor) => {
  if (actor.role !== roles.admin) {
    throw new AppError(403, 'ADMIN_REQUIRED', 'Only admins can access operations data.');
  }
};

export class OperationsService {
  constructor({ db, config, auditLogRepository }) {
    this.db = db;
    this.config = config;
    this.auditLogRepository = auditLogRepository;
  }

  async dashboardMetrics({ actor }) {
    assertAdmin(actor);

    const [
      usersTotal,
      activeRequests,
      pendingVehicles,
      openReports,
      disputedPayments,
      openTickets,
      unreadNotifications
    ] = await Promise.all([
      this.db.collection('users').countDocuments({}),
      this.db.collection('kuli_requests').countDocuments({ status: { $in: ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'unloading'] } }),
      this.db.collection('vehicles').countDocuments({ verificationStatus: 'pending' }),
      this.db.collection('reports').countDocuments({ status: { $in: ['open', 'under_review', 'awaiting_response'] } }),
      this.db.collection('payments').countDocuments({ status: 'disputed' }),
      this.db.collection('hotline_tickets').countDocuments({ status: { $in: ['open', 'assigned', 'in_progress', 'pending_client'] } }),
      this.db.collection('notifications').countDocuments({ deliveryStatus: { $ne: 'read' } })
    ]);

    return {
      usersTotal,
      activeRequests,
      pendingVehicles,
      openReports,
      disputedPayments,
      openTickets,
      unreadNotifications
    };
  }

  async releaseReadiness({ actor }) {
    assertAdmin(actor);
    return {
      runtime: validateRuntimeConfig(this.config),
      checks: {
        rateLimiting: true,
        securityHeaders: true,
        structuredLogging: true,
        auditLogViewer: true,
        demoSeedScript: true,
        smokeTests: true
      }
    };
  }

  async listAuditLogs({ actor, filters = {} }) {
    assertAdmin(actor);
    return this.auditLogRepository.list(filters);
  }
}

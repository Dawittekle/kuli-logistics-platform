import { parse } from 'node:url';
import { env } from './config/env.mjs';
import { assertRuntimeConfig } from './config/release-readiness.mjs';
import { connectToMongo } from './config/mongo.mjs';
import { AppError } from './common/errors/app-error.mjs';
import { InMemoryRateLimiter } from './common/http/rate-limit.mjs';
import { parseJsonBody } from './common/http/body.mjs';
import { createCorsHeaders, preflight } from './common/http/cors.mjs';
import { failure, success } from './common/http/json-response.mjs';
import { withSecurityHeaders } from './common/http/security-headers.mjs';
import { createRequestLogger } from './common/logging/structured-logger.mjs';
import { assertActiveAccount } from './common/guards/account-status-guard.mjs';
import { assertRole } from './common/guards/role-guard.mjs';
import { roles } from '../../../packages/shared/src/index.mjs';
import { SupabaseTokenVerifier } from './integrations/supabase/token-verifier.mjs';
import { DeterministicMapsProvider } from './integrations/maps/deterministic-maps-provider.mjs';
import { assertPublicRegistrationRole, normalizeRequestedRole } from './modules/identity/profile-sync-policy.mjs';
import { AccountService } from './modules/accounts/account-service.mjs';
import { MongoUserRepository } from './modules/accounts/mongo-user-repository.mjs';
import { bootstrapAdmin } from './modules/admin/bootstrap-admin.mjs';
import { MongoAuditLogRepository } from './modules/audit/mongo-audit-log-repository.mjs';
import { EngagementService } from './modules/engagement/engagement-service.mjs';
import { MongoPaymentRepository } from './modules/engagement/mongo-payment-repository.mjs';
import { MongoRatingRepository } from './modules/engagement/mongo-rating-repository.mjs';
import { MongoReportRepository } from './modules/engagement/mongo-report-repository.mjs';
import { MongoFileRepository } from './modules/files/mongo-file-repository.mjs';
import { MongoPricingRuleRepository } from './modules/logistics/mongo-pricing-rule-repository.mjs';
import { MongoKuliRequestRepository } from './modules/logistics/mongo-kuli-request-repository.mjs';
import { MongoKuliStatusEventRepository } from './modules/logistics/mongo-kuli-status-event-repository.mjs';
import { MongoMessageRepository } from './modules/logistics/mongo-message-repository.mjs';
import { MongoTripOfferRepository } from './modules/logistics/mongo-trip-offer-repository.mjs';
import { QuoteService } from './modules/logistics/quote-service.mjs';
import { MarketplaceService } from './modules/logistics/marketplace-service.mjs';
import { MongoNotificationRepository } from './modules/notifications/mongo-notification-repository.mjs';
import { MongoDeviceTokenRepository } from './modules/notifications/mongo-device-token-repository.mjs';
import { MongoNotificationIntentRepository } from './modules/notifications/mongo-notification-intent-repository.mjs';
import { createExternalNotificationAdapters } from './modules/notifications/notification-adapters.mjs';
import { OperationsService } from './modules/operations/operations-service.mjs';
import { MongoHotlineTicketRepository } from './modules/support/mongo-hotline-ticket-repository.mjs';
import { SupportService } from './modules/support/support-service.mjs';
import { MongoVehicleClassRepository } from './modules/vehicle-registry/mongo-vehicle-class-repository.mjs';
import { MongoVehicleDocumentRepository } from './modules/vehicle-registry/mongo-vehicle-document-repository.mjs';
import { MongoVehicleRepository } from './modules/vehicle-registry/mongo-vehicle-repository.mjs';
import { VehicleRegistryService } from './modules/vehicle-registry/vehicle-registry-service.mjs';

const createRequestId = () => `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const send = (response, result, requestId = createRequestId(), extraHeaders = {}) => {
  response.writeHead(result.statusCode, withSecurityHeaders({
    ...extraHeaders,
    ...result.headers,
    'x-request-id': requestId
  }));
  response.end(result.body);
};

const clientAddress = (request) =>
  String(request.headers['x-forwarded-for'] ?? request.socket?.remoteAddress ?? 'local').split(',')[0].trim();

const createRouteRequest = (context) => async (request) => {
  const method = request.method ?? 'GET';
  const url = parse(request.url ?? '/', true);
  const path = url.pathname ?? '/';

  const resolveAuth = async ({ required = true } = {}) => {
    const authorization = request.headers.authorization;

    if (!authorization && !required) {
      return {
        authUser: null,
        currentUser: null
      };
    }

    const authUser = await context.tokenVerifier.verifyAuthorizationHeader(authorization);
    const currentUser = await context.userRepository.findBySupabaseUserId(authUser.sub);

    return {
      authUser,
      currentUser
    };
  };

  if (method === 'GET' && path === '/api/v1/health') {
    return success({
      status: 'ok',
      service: '@kuli/api',
      authMode: context.env.supabaseJwtMode,
      persistence: 'mongodb'
    });
  }

  if (method === 'GET' && path === '/api/v1/config/public') {
    return success({
      apiVersion: 'v1',
      environment: context.env.nodeEnv,
      authMode: context.env.supabaseJwtMode,
      features: {
        digitalPayments: false,
        realtimeTracking: false,
        manualTripStatus: true,
        assistedBooking: true,
        cashPaymentRecords: true
      }
    });
  }

  if (method === 'GET' && path === '/api/v1/vehicle-classes') {
    return success(await context.vehicleRegistryService.listActiveVehicleClasses());
  }

  if (method === 'POST' && path === '/api/v1/dev/demo-profile') {
    if (context.env.nodeEnv === 'production' || !context.env.demoAuthEnabled) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'Demo auth is not enabled.');
    }

    const body = await parseJsonBody(request);
    const role = body.role;
    const suffix = body.suffix ?? Math.random().toString(36).slice(2, 8);
    const supabaseUserId = body.supabaseUserId ?? `demo-${role}-${suffix}`;
    const email = body.email ?? `${supabaseUserId}@demo.kuli.local`;
    const preserveExistingRole = Boolean(body.preserveExistingRole);

    const user = await context.accountService.upsertDemoProfile({
      supabaseUserId,
      role,
      fullName: body.fullName ?? (preserveExistingRole ? undefined : `Demo ${String(role ?? 'user').replace('_', ' ')}`),
      email,
      phone: body.phone,
      preserveExistingRole
    });

    return success({
      user,
      accessToken: `dev:${user.supabaseUserId}`
    }, 201);
  }

  if (method === 'POST' && path === '/api/v1/quotes') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.assistant]);

    return success(
      await context.quoteService.createQuote({
        actor: currentUser,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'POST' && path === '/api/v1/kuli-requests') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client]);

    return success(
      await context.marketplaceService.createRequest({
        actor: currentUser,
        input: await parseJsonBody(request),
        idempotencyKey: request.headers['idempotency-key']
      }),
      201
    );
  }

  if (method === 'GET' && path === '/api/v1/kuli-requests/mine') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.truckOwner, roles.assistant, roles.admin]);

    return success(
      await context.marketplaceService.listMine({
        actor: currentUser
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/kuli-requests') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.marketplaceService.listMine({
        actor: currentUser
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/cancel')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client]);

    const requestId = path.split('/')[4];

    return success(
      await context.marketplaceService.cancelRequest({
        actor: currentUser,
        requestId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/status')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner, roles.assistant, roles.admin]);

    const requestId = path.split('/')[4];

    return success(
      await context.marketplaceService.transitionRequestStatus({
        actor: currentUser,
        requestId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'GET' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/events')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.truckOwner, roles.assistant, roles.admin]);

    const requestId = path.split('/')[4];

    return success(
      await context.marketplaceService.listStatusEvents({
        actor: currentUser,
        requestId
      })
    );
  }

  if (method === 'GET' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/messages')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.truckOwner, roles.assistant, roles.admin]);

    const requestId = path.split('/')[4];

    return success(
      await context.marketplaceService.listMessages({
        actor: currentUser,
        requestId
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/messages')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.truckOwner, roles.assistant, roles.admin]);

    const requestId = path.split('/')[4];

    return success(
      await context.marketplaceService.sendMessage({
        actor: currentUser,
        requestId,
        input: await parseJsonBody(request),
        idempotencyKey: request.headers['idempotency-key']
      }),
      201
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/rating')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.assistant, roles.admin]);

    const requestId = path.split('/')[4];

    return success(
      await context.engagementService.submitRating({
        actor: currentUser,
        requestId,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/payment/confirm')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const requestId = path.split('/')[4];

    return success(
      await context.engagementService.confirmPayment({
        actor: currentUser,
        requestId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/kuli-requests/') && path.endsWith('/payment/dispute')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client]);

    const requestId = path.split('/')[4];

    return success(
      await context.engagementService.disputePayment({
        actor: currentUser,
        requestId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'GET' && path.startsWith('/api/v1/kuli-requests/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.truckOwner, roles.assistant, roles.admin]);

    const requestId = path.split('/')[4];

    return success(
      await context.marketplaceService.getRequest({
        actor: currentUser,
        requestId
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/auth/sync-profile') {
    const { authUser } = await resolveAuth();
    const body = await parseJsonBody(request);
    const requestedRole = normalizeRequestedRole(body.role);
    assertPublicRegistrationRole(requestedRole);

    const result = await context.accountService.syncProfile({
      authUser,
      role: requestedRole,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone
    });

    return success(result, result.created ? 201 : 200);
  }

  if (method === 'GET' && path === '/api/v1/me') {
    const { authUser, currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    return success(await context.accountService.getCurrentUser(authUser));
  }

  if (method === 'PATCH' && path === '/api/v1/me') {
    const { authUser, currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    const body = await parseJsonBody(request);
    return success(await context.accountService.updateOwnProfile(authUser, body));
  }

  if (method === 'PATCH' && path === '/api/v1/me/notification-preferences') {
    const { authUser, currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    return success(
      await context.accountService.updateOwnProfile(authUser, {
        notificationPreferences: await parseJsonBody(request)
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/devices/push-token') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    const body = await parseJsonBody(request);

    if (!body.token) {
      throw new AppError(400, 'PUSH_TOKEN_REQUIRED', 'Push token is required.');
    }

    return success(
      await context.deviceTokenRepository.save({
        id: body.id ?? `dtok_${Math.random().toString(36).slice(2, 10)}`,
        userId: currentUser.id,
        token: body.token,
        platform: body.platform,
        deviceId: body.deviceId
      }),
      201
    );
  }

  if (method === 'DELETE' && path.startsWith('/api/v1/devices/push-token/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    const tokenId = path.split('/')[5];
    const deleted = await context.deviceTokenRepository.deleteForUser({
      id: tokenId,
      userId: currentUser.id
    });

    if (!deleted) {
      throw new AppError(404, 'PUSH_TOKEN_NOT_FOUND', 'Push token was not found.');
    }

    return success(deleted);
  }

  if (method === 'GET' && path === '/api/v1/notifications') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    return success(await context.notificationRepository.listByRecipientId(currentUser.id));
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/notifications/') && path.endsWith('/read')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    const notificationId = path.split('/')[4];
    const notification = await context.notificationRepository.markRead({
      notificationId,
      recipientUserId: currentUser.id
    });

    if (!notification) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
    }

    return success(notification);
  }

  if (method === 'GET' && path.startsWith('/api/v1/owners/') && path.endsWith('/ratings')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);

    const ownerId = path.split('/')[4];

    return success(
      await context.engagementService.listOwnerRatings({
        actor: currentUser,
        ownerId
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/reports') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.truckOwner, roles.assistant, roles.admin]);

    return success(
      await context.engagementService.createReport({
        actor: currentUser,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/reports/') && path.endsWith('/evidence/upload-intent')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.assistant, roles.admin]);

    const reportId = path.split('/')[4];

    return success(
      await context.engagementService.createReportEvidenceUploadIntent({
        actor: currentUser,
        reportId,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/reports/') && path.endsWith('/evidence')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.client, roles.truckOwner, roles.assistant, roles.admin]);

    const reportId = path.split('/')[4];

    return success(
      await context.engagementService.addReportEvidence({
        actor: currentUser,
        reportId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/assistant/tickets') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.assistant, roles.admin]);

    return success(
      await context.supportService.listTickets({
        actor: currentUser,
        filters: {
          status: url.query.status,
          assignedAssistantId: url.query.assignedAssistantId,
          callerPhone: url.query.callerPhone
        }
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/assistant/tickets') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.assistant, roles.admin]);

    return success(
      await context.supportService.createTicket({
        actor: currentUser,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'GET' && path.startsWith('/api/v1/assistant/tickets/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.assistant, roles.admin]);

    const ticketId = path.split('/')[5];

    return success(
      await context.supportService.getTicket({
        actor: currentUser,
        ticketId
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/assistant/tickets/') && path.endsWith('/status')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.assistant, roles.admin]);

    const ticketId = path.split('/')[5];

    return success(
      await context.supportService.transitionTicket({
        actor: currentUser,
        ticketId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/assistant/bookings') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.assistant, roles.admin]);

    return success(
      await context.supportService.createAssistedBooking({
        actor: currentUser,
        input: await parseJsonBody(request),
        idempotencyKey: request.headers['idempotency-key']
      }),
      201
    );
  }

  if (method === 'GET' && path === '/api/v1/assistant/clients/search') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.assistant, roles.admin]);

    return success(
      await context.supportService.searchClients({
        actor: currentUser,
        phone: url.query.phone
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/users') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(await context.accountService.listUsers());
  }

  if (method === 'GET' && path.startsWith('/api/v1/admin/users/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const userId = path.split('/')[5];

    return success(
      await context.accountService.getUser({
        actor: currentUser,
        targetUserId: userId
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/dashboard') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.operationsService.dashboardMetrics({
        actor: currentUser
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/audit-logs') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.operationsService.listAuditLogs({
        actor: currentUser,
        filters: {
          actorUserId: url.query.actorUserId,
          action: url.query.action,
          targetType: url.query.targetType
        }
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/release-readiness') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.operationsService.releaseReadiness({
        actor: currentUser
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/admin/vehicle-classes') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.vehicleRegistryService.createVehicleClass({
        actor: currentUser,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/vehicle-classes/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const vehicleClassId = path.split('/')[5];

    return success(
      await context.vehicleRegistryService.updateVehicleClass({
        actor: currentUser,
        vehicleClassId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'DELETE' && path.startsWith('/api/v1/admin/vehicle-classes/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const vehicleClassId = path.split('/')[5];

    return success(
      await context.vehicleRegistryService.deactivateVehicleClass({
        actor: currentUser,
        vehicleClassId
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/pricing-rules') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.quoteService.listPricingRules({
        actor: currentUser
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/admin/pricing-rules') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.quoteService.createPricingRule({
        actor: currentUser,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/pricing-rules/') && path.endsWith('/activate')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const pricingRuleId = path.split('/')[5];

    return success(
      await context.quoteService.activatePricingRule({
        actor: currentUser,
        pricingRuleId
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/admin/jobs/expire-offers') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(await context.marketplaceService.expireTimedOutOffers());
  }

  if (method === 'POST' && path === '/api/v1/admin/jobs/expire-pending-client-tickets') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.supportService.expirePendingClientTickets({
        actor: currentUser
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/payments') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.engagementService.listPayments({
        actor: currentUser
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/payments/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const paymentId = path.split('/')[5];

    return success(
      await context.engagementService.resolvePayment({
        actor: currentUser,
        paymentId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/reports') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.engagementService.listReports({
        actor: currentUser,
        filters: {
          status: url.query.status,
          category: url.query.category
        }
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/reports/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const reportId = path.split('/')[5];

    return success(
      await context.engagementService.resolveReport({
        actor: currentUser,
        reportId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'POST' && (path === '/api/v1/admin/users' || path === '/api/v1/admin/staff-users')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const body = await parseJsonBody(request);

    return success(
      await context.accountService.provisionStaffUser({
        actor: currentUser,
        supabaseUserId: body.supabaseUserId,
        role: body.role,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone
      }),
      201
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/users/') && path.endsWith('/status')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const userId = path.split('/')[5];
    const body = await parseJsonBody(request);

    return success(
      await context.accountService.setAccountStatus({
        actor: currentUser,
        targetUserId: userId,
        accountStatus: body.accountStatus
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/vehicles') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    return success(
      await context.vehicleRegistryService.createVehicle({
        actor: currentUser,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'GET' && path === '/api/v1/vehicles/mine') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    return success(await context.vehicleRegistryService.listOwnerVehicles({ actor: currentUser }));
  }

  if (method === 'GET' && path.startsWith('/api/v1/vehicles/')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const vehicleId = path.split('/')[4];

    return success(
      await context.vehicleRegistryService.getOwnerVehicle({
        actor: currentUser,
        vehicleId
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/vehicles/') && !path.endsWith('/availability')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const vehicleId = path.split('/')[4];

    return success(
      await context.vehicleRegistryService.updateOwnerVehicle({
        actor: currentUser,
        vehicleId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/vehicles/') && path.endsWith('/availability')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const vehicleId = path.split('/')[4];

    return success(
      await context.vehicleRegistryService.updateAvailability({
        actor: currentUser,
        vehicleId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'PATCH' && path === '/api/v1/owners/me/active-vehicle') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const body = await parseJsonBody(request);

    if (body.activeVehicleId) {
      await context.vehicleRegistryService.getOwnerVehicle({
        actor: currentUser,
        vehicleId: body.activeVehicleId
      });
    }

    return success(
      await context.accountService.setOwnerActiveVehicle({
        actor: currentUser,
        activeVehicleId: body.activeVehicleId
      })
    );
  }

  if (method === 'POST' && path === '/api/v1/files/upload-intent') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    return success(
      await context.vehicleRegistryService.createUploadIntent({
        actor: currentUser,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'GET' && path.startsWith('/api/v1/files/') && path.endsWith('/signed-url')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner, roles.admin]);

    const fileId = path.split('/')[4];

    return success(
      await context.vehicleRegistryService.createSignedFileUrl({
        actor: currentUser,
        fileId
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/files/') && path.endsWith('/complete')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner, roles.admin]);

    const fileId = path.split('/')[4];

    return success(
      await context.vehicleRegistryService.completeFileUpload({
        actor: currentUser,
        fileId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/vehicles/') && path.endsWith('/documents')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const vehicleId = path.split('/')[4];

    return success(
      await context.vehicleRegistryService.attachVehicleDocument({
        actor: currentUser,
        vehicleId,
        input: await parseJsonBody(request)
      }),
      201
    );
  }

  if (method === 'GET' && path === '/api/v1/admin/vehicles/pending') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(
      await context.vehicleRegistryService.listPendingVerification({
        actor: currentUser
      })
    );
  }

  if (method === 'GET' && path === '/api/v1/owner/offers') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    return success(
      await context.marketplaceService.listOwnerOffers({
        actor: currentUser
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/offers/') && path.endsWith('/viewed')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const offerId = path.split('/')[4];

    return success(
      await context.marketplaceService.markOfferViewed({
        actor: currentUser,
        offerId
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/offers/') && path.endsWith('/decline')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const offerId = path.split('/')[4];

    return success(
      await context.marketplaceService.declineOffer({
        actor: currentUser,
        offerId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'POST' && path.startsWith('/api/v1/offers/') && path.endsWith('/accept')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.truckOwner]);

    const offerId = path.split('/')[4];

    return success(
      await context.marketplaceService.acceptOffer({
        actor: currentUser,
        offerId,
        idempotencyKey: request.headers['idempotency-key']
      })
    );
  }

  if (method === 'GET' && path.startsWith('/api/v1/admin/vehicles/') && !path.endsWith('/verification')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const vehicleId = path.split('/')[5];

    return success(
      await context.vehicleRegistryService.getAdminVehicle({
        actor: currentUser,
        vehicleId
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/vehicles/') && path.endsWith('/status')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const vehicleId = path.split('/')[5];

    return success(
      await context.vehicleRegistryService.updateAdminVehicleStatus({
        actor: currentUser,
        vehicleId,
        input: await parseJsonBody(request)
      })
    );
  }

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/vehicles/') && path.endsWith('/verification')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const vehicleId = path.split('/')[5];

    return success(
      await context.vehicleRegistryService.decideVerification({
        actor: currentUser,
        vehicleId,
        input: await parseJsonBody(request)
      })
    );
  }

  return success(
    {
      message: 'Route scaffold exists but has not been implemented yet.',
      method,
      path
    },
    404
  );
};

export const createAppContext = async (config = env) => {
  assertRuntimeConfig(config);
  const { client, db } = await connectToMongo(config.mongodbUri, {
    serverSelectionTimeoutMs: config.mongodbServerSelectionTimeoutMs
  });
  const userRepository = new MongoUserRepository({ db });
  const vehicleClassRepository = new MongoVehicleClassRepository({ db });
  const vehicleRepository = new MongoVehicleRepository({ db });
  const vehicleDocumentRepository = new MongoVehicleDocumentRepository({ db });
  const fileRepository = new MongoFileRepository({ db });
  const auditLogRepository = new MongoAuditLogRepository({ db });
  const paymentRepository = new MongoPaymentRepository({ db });
  const ratingRepository = new MongoRatingRepository({ db });
  const reportRepository = new MongoReportRepository({ db });
  const pricingRuleRepository = new MongoPricingRuleRepository({ db });
  const kuliRequestRepository = new MongoKuliRequestRepository({ db });
  const statusEventRepository = new MongoKuliStatusEventRepository({ db });
  const messageRepository = new MongoMessageRepository({ db });
  const tripOfferRepository = new MongoTripOfferRepository({ db });
  const notificationRepository = new MongoNotificationRepository({ db });
  const deviceTokenRepository = new MongoDeviceTokenRepository({ db });
  const notificationIntentRepository = new MongoNotificationIntentRepository({ db });
  const hotlineTicketRepository = new MongoHotlineTicketRepository({ db });
  const notificationAdapters = createExternalNotificationAdapters();
  const requestLogger = createRequestLogger({
    env: config.nodeEnv
  });
  const rateLimiter = new InMemoryRateLimiter();

  await userRepository.ensureIndexes();
  await vehicleClassRepository.ensureIndexes();
  await vehicleRepository.ensureIndexes();
  await vehicleDocumentRepository.ensureIndexes();
  await fileRepository.ensureIndexes();
  await auditLogRepository.ensureIndexes();
  await paymentRepository.ensureIndexes();
  await ratingRepository.ensureIndexes();
  await reportRepository.ensureIndexes();
  await pricingRuleRepository.ensureIndexes();
  await kuliRequestRepository.ensureIndexes();
  await statusEventRepository.ensureIndexes();
  await messageRepository.ensureIndexes();
  await tripOfferRepository.ensureIndexes();
  await notificationRepository.ensureIndexes();
  await deviceTokenRepository.ensureIndexes();
  await notificationIntentRepository.ensureIndexes();
  await hotlineTicketRepository.ensureIndexes();

  const accountService = new AccountService({ userRepository });
  const vehicleRegistryService = new VehicleRegistryService({
    vehicleClassRepository,
    vehicleRepository,
    vehicleDocumentRepository,
    fileRepository,
    auditLogRepository
  });
  const quoteService = new QuoteService({
    pricingRuleRepository,
    vehicleClassRepository,
    vehicleRepository,
    userRepository,
    mapsProvider: new DeterministicMapsProvider()
  });
  const marketplaceService = new MarketplaceService({
    kuliRequestRepository,
    tripOfferRepository,
    vehicleRepository,
    notificationRepository,
    statusEventRepository,
    messageRepository,
    paymentRepository,
    quoteService
  });
  const supportService = new SupportService({
    hotlineTicketRepository,
    userRepository,
    marketplaceService,
    notificationIntentRepository
  });
  const engagementService = new EngagementService({
    kuliRequestRepository,
    paymentRepository,
    ratingRepository,
    reportRepository,
    userRepository,
    auditLogRepository,
    fileRepository,
    notificationRepository
  });
  const operationsService = new OperationsService({
    db,
    config,
    auditLogRepository
  });
  const tokenVerifier = new SupabaseTokenVerifier({
    mode: config.supabaseJwtMode,
    issuer: config.supabaseJwtIssuer,
    audience: config.supabaseJwtAudience,
    jwksUrl: config.supabaseJwksUrl,
    supabaseUrl: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
    allowDevelopmentTokens: config.nodeEnv !== 'production' && config.demoAuthEnabled
  });

  await bootstrapAdmin({
    accountService,
    config
  });

  await vehicleRegistryService.seedDefaultVehicleClasses();
  await quoteService.seedDefaultPricingRule();

  return {
    env: config,
    mongoClient: client,
    db,
    userRepository,
    accountService,
    vehicleRegistryService,
    quoteService,
    marketplaceService,
    supportService,
    engagementService,
    operationsService,
    notificationRepository,
    deviceTokenRepository,
    notificationIntentRepository,
    notificationAdapters,
    tokenVerifier,
    requestLogger,
    rateLimiter
  };
};

let sharedAppContextPromise = null;

export const getAppContext = async () => {
  if (!sharedAppContextPromise) {
    sharedAppContextPromise = createAppContext().catch((error) => {
      sharedAppContextPromise = null;
      throw error;
    });
  }

  return sharedAppContextPromise;
};

export const resetAppContextForTests = () => {
  sharedAppContextPromise = null;
};

export const handleRequest = async (request, response) => {
  const requestId = request.headers['x-request-id'] ?? createRequestId();
  const startedAt = Date.now();
  const corsHeaders = createCorsHeaders({
    origin: request.headers.origin,
    allowedOrigins: env.corsOrigins,
    allowPrivateNetwork: env.corsAllowPrivateNetwork
  });
  let context;

  try {
    if (request.method === 'OPTIONS') {
      send(response, preflight(corsHeaders), requestId);
      return;
    }

    context = await getAppContext();
    context.rateLimiter.check({
      key: `${clientAddress(request)}:${request.method ?? 'GET'}:${parse(request.url ?? '/', true).pathname ?? '/'}`
    });
    const routeRequest = createRouteRequest(context);
    const result = await routeRequest(request);
    send(response, result, requestId, corsHeaders);
    context.requestLogger.info('request.completed', {
      requestId,
      method: request.method,
      path: parse(request.url ?? '/', true).pathname,
      statusCode: result.statusCode,
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    if (error instanceof AppError) {
      send(response, failure(error, { requestId }), requestId, corsHeaders);
      context?.requestLogger.info('request.failed', {
        requestId,
        method: request.method,
        path: parse(request.url ?? '/', true).pathname,
        statusCode: error.statusCode,
        errorCode: error.code,
        latencyMs: Date.now() - startedAt
      });
      return;
    }

    const internalError = new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error.', {
      originalError: error instanceof Error ? error.message : String(error)
    });
    send(
      response,
      failure(internalError, { requestId }),
      requestId,
      corsHeaders
    );
    context?.requestLogger.error('request.error', {
      requestId,
      method: request.method,
      path: parse(request.url ?? '/', true).pathname,
      statusCode: 500,
      errorCode: internalError.code,
      latencyMs: Date.now() - startedAt
    });
  }
};

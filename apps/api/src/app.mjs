import { parse } from 'node:url';
import { env } from './config/env.mjs';
import { connectToMongo } from './config/mongo.mjs';
import { AppError } from './common/errors/app-error.mjs';
import { parseJsonBody } from './common/http/body.mjs';
import { failure, success } from './common/http/json-response.mjs';
import { assertActiveAccount } from './common/guards/account-status-guard.mjs';
import { assertRole } from './common/guards/role-guard.mjs';
import { roles } from '../../../packages/shared/src/index.mjs';
import { SupabaseTokenVerifier } from './integrations/supabase/token-verifier.mjs';
import { assertPublicRegistrationRole, normalizeRequestedRole } from './modules/identity/profile-sync-policy.mjs';
import { AccountService } from './modules/accounts/account-service.mjs';
import { MongoUserRepository } from './modules/accounts/mongo-user-repository.mjs';
import { bootstrapAdmin } from './modules/admin/bootstrap-admin.mjs';
import { MongoAuditLogRepository } from './modules/audit/mongo-audit-log-repository.mjs';
import { MongoFileRepository } from './modules/files/mongo-file-repository.mjs';
import { MongoVehicleClassRepository } from './modules/vehicle-registry/mongo-vehicle-class-repository.mjs';
import { MongoVehicleDocumentRepository } from './modules/vehicle-registry/mongo-vehicle-document-repository.mjs';
import { MongoVehicleRepository } from './modules/vehicle-registry/mongo-vehicle-repository.mjs';
import { VehicleRegistryService } from './modules/vehicle-registry/vehicle-registry-service.mjs';

const send = (response, result) => {
  response.writeHead(result.statusCode, result.headers);
  response.end(result.body);
};

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

  if (method === 'GET' && path === '/api/v1/vehicle-classes') {
    return success(await context.vehicleRegistryService.listActiveVehicleClasses());
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

  if (method === 'GET' && path === '/api/v1/admin/users') {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    return success(await context.accountService.listUsers());
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

    const vehicleId = path.split('/')[5];

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

  if (method === 'PATCH' && path.startsWith('/api/v1/admin/vehicles/') && path.endsWith('/verification')) {
    const { currentUser } = await resolveAuth();
    assertActiveAccount(currentUser);
    assertRole(currentUser, [roles.admin]);

    const vehicleId = path.split('/')[4];

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
  const { client, db } = await connectToMongo(config.mongodbUri, {
    serverSelectionTimeoutMs: config.mongodbServerSelectionTimeoutMs
  });
  const userRepository = new MongoUserRepository({ db });
  const vehicleClassRepository = new MongoVehicleClassRepository({ db });
  const vehicleRepository = new MongoVehicleRepository({ db });
  const vehicleDocumentRepository = new MongoVehicleDocumentRepository({ db });
  const fileRepository = new MongoFileRepository({ db });
  const auditLogRepository = new MongoAuditLogRepository({ db });

  await userRepository.ensureIndexes();
  await vehicleClassRepository.ensureIndexes();
  await vehicleRepository.ensureIndexes();
  await vehicleDocumentRepository.ensureIndexes();
  await fileRepository.ensureIndexes();
  await auditLogRepository.ensureIndexes();

  const accountService = new AccountService({ userRepository });
  const vehicleRegistryService = new VehicleRegistryService({
    vehicleClassRepository,
    vehicleRepository,
    vehicleDocumentRepository,
    fileRepository,
    auditLogRepository
  });
  const tokenVerifier = new SupabaseTokenVerifier({
    mode: config.supabaseJwtMode,
    issuer: config.supabaseJwtIssuer,
    audience: config.supabaseJwtAudience,
    jwksUrl: config.supabaseJwksUrl,
    supabaseUrl: config.supabaseUrl,
    anonKey: config.supabaseAnonKey
  });

  await bootstrapAdmin({
    accountService,
    config
  });

  await vehicleRegistryService.seedDefaultVehicleClasses();

  return {
    env: config,
    mongoClient: client,
    db,
    userRepository,
    accountService,
    vehicleRegistryService,
    tokenVerifier
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
  try {
    const context = await getAppContext();
    const routeRequest = createRouteRequest(context);
    const result = await routeRequest(request);
    send(response, result);
  } catch (error) {
    if (error instanceof AppError) {
      send(response, failure(error));
      return;
    }

    send(
      response,
      failure(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error.', {
        originalError: error instanceof Error ? error.message : String(error)
      }))
    );
  }
};

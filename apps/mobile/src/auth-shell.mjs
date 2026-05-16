import { roles } from '../../../packages/shared/src/index.mjs';

export const publicAuthRoutes = ['/auth/login', '/auth/register', '/auth/otp'];

export const mobileEntryRouteByRole = {
  [roles.client]: '/client/home',
  [roles.truckOwner]: '/owner/home'
};

export const mobileNavigationByRole = {
  [roles.client]: [
    '/client/home',
    '/client/request/new',
    '/client/request/quote',
    '/client/history',
    '/client/notifications',
    '/client/profile'
  ],
  [roles.truckOwner]: [
    '/owner/home',
    '/owner/vehicles',
    '/owner/vehicles/new',
    '/owner/offers',
    '/owner/trips/:id',
    '/owner/earnings',
    '/owner/notifications',
    '/owner/profile'
  ]
};

export const publicSelfRegistrationRoles = [roles.client, roles.truckOwner];


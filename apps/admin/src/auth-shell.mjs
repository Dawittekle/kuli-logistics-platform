import { roles } from '../../../packages/shared/src/index.mjs';

export const adminEntryRouteByRole = {
  [roles.admin]: '/admin/dashboard',
  [roles.assistant]: '/assistant/tickets'
};

export const adminNavigationByRole = {
  [roles.admin]: [
    '/admin/dashboard',
    '/admin/users',
    '/admin/vehicles/pending',
    '/admin/vehicle-classes',
    '/admin/pricing',
    '/admin/requests',
    '/admin/reports',
    '/admin/payments',
    '/admin/audit-logs'
  ],
  [roles.assistant]: [
    '/assistant/tickets',
    '/assistant/tickets/:id',
    '/assistant/bookings/new',
    '/assistant/clients'
  ]
};

export const isAllowedAdminRoute = (role, path) =>
  (adminNavigationByRole[role] ?? []).some((route) => path.startsWith(route.replace('/:id', '')));


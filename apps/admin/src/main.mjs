import { adminEntryRouteByRole, adminNavigationByRole } from './auth-shell.mjs';

console.log('@kuli/admin placeholder scaffold');
console.log(
  JSON.stringify(
    {
      loginRoute: '/login',
      entryRoutes: adminEntryRouteByRole,
      navigation: adminNavigationByRole
    },
    null,
    2
  )
);


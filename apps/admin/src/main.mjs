import { adminEntryRouteByRole, adminNavigationByRole } from './auth-shell.mjs';
import { adminAppConfig } from './config.mjs';

console.log('@kuli/admin placeholder scaffold');
console.log(
  JSON.stringify(
    {
      config: adminAppConfig,
      loginRoute: '/login',
      entryRoutes: adminEntryRouteByRole,
      navigation: adminNavigationByRole
    },
    null,
    2
  )
);

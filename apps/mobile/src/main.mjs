import { mobileEntryRouteByRole, mobileNavigationByRole, publicAuthRoutes, publicSelfRegistrationRoles } from './auth-shell.mjs';
import { mobileAppConfig } from './config.mjs';

console.log('@kuli/mobile placeholder scaffold');
console.log(
  JSON.stringify(
    {
      config: mobileAppConfig,
      publicAuthRoutes,
      publicSelfRegistrationRoles,
      entryRoutes: mobileEntryRouteByRole,
      navigation: mobileNavigationByRole
    },
    null,
    2
  )
);

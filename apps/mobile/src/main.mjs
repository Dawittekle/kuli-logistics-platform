import { mobileEntryRouteByRole, mobileNavigationByRole, publicAuthRoutes, publicSelfRegistrationRoles } from './auth-shell.mjs';

console.log('@kuli/mobile placeholder scaffold');
console.log(
  JSON.stringify(
    {
      publicAuthRoutes,
      publicSelfRegistrationRoles,
      entryRoutes: mobileEntryRouteByRole,
      navigation: mobileNavigationByRole
    },
    null,
    2
  )
);


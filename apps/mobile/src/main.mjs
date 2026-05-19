import { mobileEntryRouteByRole, mobileNavigationByRole, publicAuthRoutes, publicSelfRegistrationRoles } from './auth-shell.mjs';
import { mobileAppConfig } from './config.mjs';
import { candidateResultCardFields, clientQuoteFlow } from './quote-shell.mjs';

console.log('@kuli/mobile placeholder scaffold');
console.log(
  JSON.stringify(
    {
      config: mobileAppConfig,
      publicAuthRoutes,
      publicSelfRegistrationRoles,
      quoteFlow: clientQuoteFlow,
      candidateResultCardFields,
      entryRoutes: mobileEntryRouteByRole,
      navigation: mobileNavigationByRole
    },
    null,
    2
  )
);

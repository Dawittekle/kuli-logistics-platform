import { mobileEntryRouteByRole, mobileNavigationByRole, publicAuthRoutes, publicSelfRegistrationRoles } from './auth-shell.mjs';
import { mobileAppConfig } from './config.mjs';
import { clientWaitingState, ownerOfferInbox } from './marketplace-shell.mjs';
import { candidateResultCardFields, clientQuoteFlow } from './quote-shell.mjs';
import { clientTripTimeline, notificationCenter, ownerActiveTripFlow, tripMessageThread } from './trip-shell.mjs';

console.log('@kuli/mobile placeholder scaffold');
console.log(
  JSON.stringify(
    {
      config: mobileAppConfig,
      publicAuthRoutes,
      publicSelfRegistrationRoles,
      quoteFlow: clientQuoteFlow,
      candidateResultCardFields,
      clientWaitingState,
      ownerOfferInbox,
      ownerActiveTripFlow,
      clientTripTimeline,
      tripMessageThread,
      notificationCenter,
      entryRoutes: mobileEntryRouteByRole,
      navigation: mobileNavigationByRole
    },
    null,
    2
  )
);

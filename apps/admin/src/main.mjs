import { adminEntryRouteByRole, adminNavigationByRole } from './auth-shell.mjs';
import { assistedBookingWizard, assistantClientLookup, assistantTicketDetail, assistantTicketQueue } from './assistant-shell.mjs';
import { adminAppConfig } from './config.mjs';
import { adminPricingWorkspace } from './pricing-shell.mjs';

console.log('@kuli/admin placeholder scaffold');
console.log(
  JSON.stringify(
    {
      config: adminAppConfig,
      pricingWorkspace: adminPricingWorkspace,
      assistantWorkspace: {
        ticketQueue: assistantTicketQueue,
        ticketDetail: assistantTicketDetail,
        bookingWizard: assistedBookingWizard,
        clientLookup: assistantClientLookup
      },
      loginRoute: '/login',
      entryRoutes: adminEntryRouteByRole,
      navigation: adminNavigationByRole
    },
    null,
    2
  )
);

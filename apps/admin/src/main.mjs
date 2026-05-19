import { adminEntryRouteByRole, adminNavigationByRole } from './auth-shell.mjs';
import { assistedBookingWizard, assistantClientLookup, assistantTicketDetail, assistantTicketQueue } from './assistant-shell.mjs';
import { adminAppConfig } from './config.mjs';
import { adminAuditLogWorkspace, adminDashboardWorkspace, adminUserManagementWorkspace, releaseReadinessWorkspace } from './operations-shell.mjs';
import { adminPricingWorkspace } from './pricing-shell.mjs';
import { adminPaymentsWorkspace, adminReportsWorkspace, trustSignalsWorkspace } from './trust-shell.mjs';

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
      trustWorkspace: {
        reports: adminReportsWorkspace,
        payments: adminPaymentsWorkspace,
        signals: trustSignalsWorkspace
      },
      operationsWorkspace: {
        dashboard: adminDashboardWorkspace,
        users: adminUserManagementWorkspace,
        auditLogs: adminAuditLogWorkspace,
        releaseReadiness: releaseReadinessWorkspace
      },
      loginRoute: '/login',
      entryRoutes: adminEntryRouteByRole,
      navigation: adminNavigationByRole
    },
    null,
    2
  )
);

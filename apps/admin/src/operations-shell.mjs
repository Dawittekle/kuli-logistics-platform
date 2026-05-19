export const adminDashboardWorkspace = {
  route: '/admin/dashboard',
  sourceEndpoints: {
    metrics: 'GET /api/v1/admin/dashboard',
    readiness: 'GET /api/v1/admin/release-readiness'
  },
  metrics: ['usersTotal', 'activeRequests', 'pendingVehicles', 'openReports', 'disputedPayments', 'openTickets'],
  refreshBehavior: {
    strategy: 'manual_refresh_or_focus_refetch',
    optimisticMetrics: false
  },
  visualDirection: {
    layout: 'operations_signal_grid_above_exception_queues',
    density: 'high',
    tone: 'control_room',
    accentRules: ['amber_for_pending_work', 'red_for_disputes_or_failed_checks', 'green_for_ready_checks'],
    avoids: ['decorative_sales_charts', 'vanity_metric_tiles_without_links', 'purple_gradient_theme']
  }
};

export const adminUserManagementWorkspace = {
  route: '/admin/users',
  sourceEndpoints: {
    list: 'GET /api/v1/admin/users',
    detail: 'GET /api/v1/admin/users/:id',
    status: 'PATCH /api/v1/admin/users/:id/status',
    createStaff: 'POST /api/v1/admin/staff-users'
  },
  filters: ['role', 'accountStatus', 'search'],
  tableColumns: ['fullName', 'role', 'accountStatus', 'email', 'phone', 'createdAt'],
  decisionDrawer: {
    statusActions: ['active', 'pending_verification', 'suspended', 'banned'],
    protectedRules: ['admin_to_admin_status_changes_blocked_by_api']
  },
  visualDirection: {
    layout: 'filterable_user_table_with_status_decision_panel',
    density: 'high',
    tone: 'staff_control',
    accentRules: ['red_for_suspended_or_banned', 'amber_for_pending', 'neutral_for_active']
  }
};

export const adminAuditLogWorkspace = {
  route: '/admin/audit-logs',
  sourceEndpoints: {
    list: 'GET /api/v1/admin/audit-logs'
  },
  filters: ['actorUserId', 'action', 'targetType'],
  tableColumns: ['createdAt', 'actorRole', 'actorUserId', 'action', 'targetType', 'targetId'],
  detailPanelFields: ['metadata', 'requestId', 'ipAddress', 'userAgent'],
  visualDirection: {
    layout: 'append_only_log_table_with_metadata_panel',
    density: 'high',
    tone: 'forensic_audit',
    accentRules: ['monospace_ids', 'red_for_security_sensitive_actions', 'muted_metadata_json']
  }
};

export const releaseReadinessWorkspace = {
  route: '/admin/release-readiness',
  sourceEndpoints: {
    readiness: 'GET /api/v1/admin/release-readiness'
  },
  sections: ['runtime_config', 'security_hardening', 'smoke_tests', 'deployment_checklist'],
  localCommands: ['npm run lint', 'npm run typecheck', 'npm test', 'npm run smoke:critical', 'npm run verify:startup'],
  visualDirection: {
    layout: 'checklist_matrix_with_command_history_strip',
    density: 'compact',
    tone: 'release_gate',
    avoids: ['confetti_success_state', 'hiding_failed_checks']
  }
};

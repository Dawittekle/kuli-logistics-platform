export const adminReportsWorkspace = {
  route: '/admin/reports',
  sourceEndpoints: {
    list: 'GET /api/v1/admin/reports',
    resolve: 'PATCH /api/v1/admin/reports/:id',
    evidence: 'POST /api/v1/reports/:id/evidence'
  },
  filters: ['status', 'category', 'reportedUserId'],
  tableColumns: ['reportCode', 'status', 'category', 'requestId', 'reportedUserId', 'createdAt'],
  resolutionDrawer: {
    requiredFields: ['outcome', 'note'],
    outcomes: ['warning', 'suspension', 'rejected', 'resolved_no_action', 'refund_recommended', 'visibility_penalty'],
    auditBehavior: 'server_writes_audit_log'
  },
  visualDirection: {
    layout: 'queue_table_with_evidence_and_decision_drawer',
    density: 'high',
    tone: 'trust_and_safety_console',
    accentRules: ['red_for_safety', 'amber_for_awaiting_response', 'neutral_for_resolved'],
    avoids: ['case_cards_inside_page_cards', 'decorative_charts_before_resolution_tools']
  }
};

export const adminPaymentsWorkspace = {
  route: '/admin/payments',
  sourceEndpoints: {
    list: 'GET /api/v1/admin/payments',
    resolve: 'PATCH /api/v1/admin/payments/:id'
  },
  filters: ['status', 'payeeOwnerId', 'requestId'],
  tableColumns: ['requestId', 'status', 'amountExpected', 'amountConfirmed', 'method', 'payeeOwnerId', 'updatedAt'],
  resolutionDrawer: {
    requiredFields: ['resolutionNote'],
    optionalFields: ['amountConfirmed'],
    auditBehavior: 'server_writes_audit_log'
  },
  visualDirection: {
    layout: 'reconciliation_table_with_amount_detail_panel',
    density: 'high',
    tone: 'finance_operations',
    accentRules: ['amber_for_disputed', 'green_for_resolved', 'red_for_adjustment_needed'],
    avoids: ['payment_gateway_language_before_gateway_exists', 'optimistic_resolution']
  }
};

export const trustSignalsWorkspace = {
  route: '/admin/trust',
  sourceEndpoints: {
    reports: 'GET /api/v1/admin/reports',
    payments: 'GET /api/v1/admin/payments',
    ownerRatings: 'GET /api/v1/owners/:id/ratings'
  },
  visibleSignals: ['visibilityPenaltyScore', 'averageRating', 'unresolvedReportCount', 'paymentDisputeCount'],
  visualDirection: {
    layout: 'operator_signal_board',
    density: 'compact',
    tone: 'risk_review',
    avoids: ['leaderboard_gamification', 'single_score_without_evidence']
  }
};

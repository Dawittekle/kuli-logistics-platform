export const clientPostTripActions = {
  route: '/client/request/:id/post-trip',
  sourceEndpoints: {
    request: 'GET /api/v1/kuli-requests/:id',
    rating: 'POST /api/v1/kuli-requests/:id/rating',
    report: 'POST /api/v1/reports',
    paymentDispute: 'POST /api/v1/kuli-requests/:id/payment/dispute'
  },
  panels: ['trip_summary', 'rating_form', 'report_form', 'payment_dispute'],
  guards: {
    rating: 'completed_or_accepted_then_cancelled_with_owner',
    report: 'request_participant_or_assisted_context',
    paymentDispute: 'completed_or_cancelled_trip'
  },
  behavior: {
    duplicateRatingState: 'already_rated',
    reportIdempotencyKey: 'client_report_submission_id',
    optimisticPaymentDispute: false
  },
  visualDirection: {
    layout: 'post_trip_action_stack_with_trip_receipt_header',
    density: 'compact',
    tone: 'calm_resolution',
    accentRules: ['green_for_submitted_rating', 'amber_for_dispute_pending', 'red_for_safety_report'],
    avoids: ['celebratory_rating_only_screen', 'hidden_report_entry', 'fake_payment_resolution']
  }
};

export const ownerPaymentConsole = {
  route: '/owner/trips/:id/payment',
  sourceEndpoints: {
    request: 'GET /api/v1/kuli-requests/:id',
    confirm: 'POST /api/v1/kuli-requests/:id/payment/confirm'
  },
  requiredTripStatus: 'completed',
  fields: ['amountExpected', 'amountConfirmed', 'method', 'confirmedAt'],
  behavior: {
    optimisticConfirmation: false,
    replayState: 'payment_already_confirmed',
    beforeCompletionState: 'finish_trip_before_confirming_payment'
  },
  visualDirection: {
    layout: 'receipt_first_owner_confirmation_panel',
    density: 'high',
    tone: 'cash_reconciliation',
    accentRules: ['green_only_after_backend_confirmation', 'amber_for_pending_cash', 'red_for_disputed']
  }
};

export const ownerRatingsView = {
  route: '/owner/ratings',
  sourceEndpoints: {
    list: 'GET /api/v1/owners/:id/ratings'
  },
  summaryFields: ['averageRating', 'ratingCount', 'recentReviewText', 'moderationStatus'],
  visualDirection: {
    layout: 'rating_summary_above_recent_feedback_rows',
    density: 'compact',
    tone: 'trust_scorecard',
    avoids: ['vanity_social_profile', 'oversized_stars_without_context']
  }
};

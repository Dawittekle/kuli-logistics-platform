export const clientWaitingState = {
  route: '/client/request/:id',
  status: 'waiting_for_owner_acceptance',
  primaryRegions: ['quote_snapshot', 'targeted_offers', 'timeout_countdown', 'cancel_action'],
  refreshBehavior: {
    strategy: 'poll_or_refetch_on_focus',
    optimisticAcceptance: false,
    conflictCopy: 'Request already accepted or unavailable.'
  },
  visibleSignals: ['offerCount', 'expiresAt', 'pickupSummary', 'destinationSummary', 'totalEstimate'],
  emptyStates: {
    timedOut: {
      title: 'No owner accepted in time',
      recoveryActions: ['try_again', 'adjust_vehicle_class', 'call_assistant']
    },
    cancelled: {
      title: 'Request cancelled',
      recoveryActions: ['start_new_request']
    }
  },
  visualDirection: {
    layout: 'timeline_above_offer_status_rows',
    density: 'compact',
    tone: 'calm_waiting_room',
    avoids: ['fake_live_acceptance', 'celebratory_animation_before_backend_confirmation']
  }
};

export const ownerOfferInbox = {
  route: '/owner/offers',
  cardFields: [
    'pickupLocation',
    'destinationLocation',
    'loadDetails',
    'quoteSnapshot.totalEstimate',
    'distanceKmAtOffer',
    'etaMinutesAtOffer',
    'expiresAt'
  ],
  commands: [
    {
      id: 'viewed',
      endpoint: 'POST /api/v1/offers/:id/viewed',
      optimistic: true
    },
    {
      id: 'accept',
      endpoint: 'POST /api/v1/offers/:id/accept',
      optimistic: false,
      conflictState: 'request_already_accepted_or_vehicle_unavailable'
    },
    {
      id: 'decline',
      endpoint: 'POST /api/v1/offers/:id/decline',
      optimistic: true
    }
  ],
  visualDirection: {
    layout: 'expiration_sorted_work_queue',
    density: 'high',
    tone: 'dispatch_board',
    accentRules: ['amber_for_expiring', 'green_only_after_accept_success', 'red_for_conflict_or_expired']
  }
};

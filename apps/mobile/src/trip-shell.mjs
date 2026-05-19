export const ownerActiveTripFlow = {
  route: '/owner/trips/active/:id',
  sourceEndpoints: {
    request: 'GET /api/v1/kuli-requests/:id',
    events: 'GET /api/v1/kuli-requests/:id/events',
    updateStatus: 'PATCH /api/v1/kuli-requests/:id/status'
  },
  statusStepper: [
    'accepted',
    'en_route_to_pickup',
    'arrived_at_pickup',
    'loading',
    'in_transit',
    'unloading',
    'completed'
  ],
  controls: {
    primaryCommand: 'advance_to_next_valid_status',
    destructiveCommand: 'cancel_with_reason',
    optimisticStatusUpdates: false,
    conflictState: 'status_changed_before_confirmation'
  },
  visualDirection: {
    layout: 'single_job_console_with_next_action_bar',
    density: 'high',
    tone: 'driver_workbench',
    accentRules: ['green_only_after_server_confirmation', 'amber_for_waiting_at_location', 'red_for_cancel']
  }
};

export const clientTripTimeline = {
  route: '/client/request/:id/timeline',
  sourceEndpoints: {
    request: 'GET /api/v1/kuli-requests/:id',
    events: 'GET /api/v1/kuli-requests/:id/events'
  },
  timelineRows: [
    'accepted',
    'en_route_to_pickup',
    'arrived_at_pickup',
    'loading',
    'in_transit',
    'unloading',
    'completed'
  ],
  refreshBehavior: {
    strategy: 'poll_or_refetch_on_focus',
    optimisticStatusUpdates: false,
    emptyCopy: 'Status updates will appear here after the owner starts the trip.'
  },
  visualDirection: {
    layout: 'route_timeline_above_trip_summary',
    density: 'compact',
    tone: 'clear_customer_tracking',
    avoids: ['continuous_gps_claims', 'fake_live_map_motion']
  }
};

export const tripMessageThread = {
  route: '/trip/:id/messages',
  sourceEndpoints: {
    list: 'GET /api/v1/kuli-requests/:id/messages',
    send: 'POST /api/v1/kuli-requests/:id/messages'
  },
  retryModel: {
    idempotencyKey: 'clientGeneratedId',
    localPendingState: true,
    duplicateSubmitBehavior: 'server_replays_existing_message'
  },
  visibleStates: ['sending', 'sent', 'retryable_error', 'thread_closed'],
  visualDirection: {
    layout: 'request_scoped_conversation_with_trip_context_header',
    density: 'comfortable',
    tone: 'practical_support_chat',
    avoids: ['social_chat_extras', 'unbounded_media_controls_before_storage_is_ready']
  }
};

export const notificationCenter = {
  route: '/notifications',
  sourceEndpoints: {
    list: 'GET /api/v1/notifications',
    markRead: 'PATCH /api/v1/notifications/:id/read',
    preferences: 'PATCH /api/v1/me/notification-preferences'
  },
  sections: ['unread_transactional', 'trip_updates', 'system_messages'],
  optimisticActions: ['mark_read'],
  visualDirection: {
    layout: 'priority_grouped_inbox',
    density: 'high',
    tone: 'operations_log',
    accentRules: ['bold_unread_marker', 'muted_read_rows', 'red_only_for_failed_or_cancelled_events']
  }
};

export const assistantTicketQueue = {
  route: '/assistant/tickets',
  sourceEndpoints: {
    list: 'GET /api/v1/assistant/tickets',
    create: 'POST /api/v1/assistant/tickets',
    expirePendingClient: 'POST /api/v1/admin/jobs/expire-pending-client-tickets'
  },
  filters: ['status', 'assignedAssistantId', 'callerPhone'],
  tableColumns: ['ticketCode', 'status', 'callerPhone', 'source', 'assignedAssistantId', 'followUpAt', 'createdAt'],
  rowActions: ['claim_open_ticket', 'resume_pending_client', 'open_detail'],
  emptyStates: {
    open: 'No open hotline tickets.',
    assigned: 'No assigned tickets in your queue.'
  },
  visualDirection: {
    layout: 'dense_call_queue_with_fixed_action_rail',
    density: 'high',
    tone: 'call_center_console',
    accentRules: ['amber_for_pending_client', 'green_for_ready_to_book', 'red_for_overdue_follow_up'],
    avoids: ['marketing_dashboard_cards', 'decorative_illustrations', 'slow_modal_first_workflows']
  }
};

export const assistantTicketDetail = {
  route: '/assistant/tickets/:id',
  sourceEndpoints: {
    detail: 'GET /api/v1/assistant/tickets/:id',
    transition: 'PATCH /api/v1/assistant/tickets/:id/status',
    clientLookup: 'GET /api/v1/assistant/clients/search'
  },
  statusControls: [
    {
      from: 'open',
      actions: ['assign_to_me', 'cancel']
    },
    {
      from: 'assigned',
      actions: ['start_call_work', 'cancel']
    },
    {
      from: 'in_progress',
      actions: ['mark_pending_client', 'close', 'cancel', 'create_booking']
    },
    {
      from: 'pending_client',
      actions: ['resume_call', 'close', 'cancel']
    }
  ],
  lockedStates: ['closed', 'cancelled'],
  visualDirection: {
    layout: 'left_ticket_facts_right_call_notes_and_next_step',
    density: 'compact',
    tone: 'assisted_booking_desk',
    accentRules: ['locked_banner_for_closed', 'thin_red_edge_for_cancellation', 'blue_reserved_for_lookup_match']
  }
};

export const assistedBookingWizard = {
  route: '/assistant/bookings/new',
  sourceEndpoints: {
    quote: 'POST /api/v1/quotes',
    createBooking: 'POST /api/v1/assistant/bookings'
  },
  steps: [
    'ticket_and_client_contact',
    'pickup_destination_and_load',
    'vehicle_candidates_and_quote',
    'client_confirmation',
    'dispatch_and_sms_intent'
  ],
  requiredData: ['ticketId', 'clientContactSnapshot.phone', 'pickupLocation', 'destinationLocation', 'loadDetails'],
  behavior: {
    idempotencyKey: 'assistant_booking_submission_id',
    optimisticDispatch: false,
    afterSuccess: ['show_waiting_state', 'link_ticket_request', 'surface_sms_confirmation_intent']
  },
  visualDirection: {
    layout: 'single_screen_wizard_with_quote_sidebar',
    density: 'high',
    tone: 'live_call_form',
    avoids: ['full_page_hero', 'large_blank_confirmation_screens', 'optimistic_offer_dispatch']
  }
};

export const assistantClientLookup = {
  route: '/assistant/clients',
  sourceEndpoints: {
    search: 'GET /api/v1/assistant/clients/search?phone=:phone'
  },
  resultFields: ['fullName', 'phone', 'email', 'accountStatus', 'createdAt'],
  duplicateTicketSignal: {
    sourceEndpoint: 'GET /api/v1/assistant/tickets?callerPhone=:phone',
    visibleWhen: 'recent_open_or_pending_ticket_exists'
  },
  visualDirection: {
    layout: 'phone_first_lookup_with_recent_ticket_strip',
    density: 'compact',
    tone: 'support_identity_check',
    accentRules: ['neutral_for_exact_match', 'amber_for_recent_duplicate_ticket']
  }
};

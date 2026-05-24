export const clientQuoteFlow = {
  route: '/client/request/quote',
  tone: 'dense-operational',
  primaryAction: 'send_request_after_candidate_selection',
  steps: [
    {
      id: 'route',
      label: 'Route',
      fields: ['pickupLocation', 'destinationLocation'],
      interaction: 'addis_area_dropdown_with_address_notes_and_pin_adjustment'
    },
    {
      id: 'load',
      label: 'Load',
      fields: ['itemType', 'estimatedWeightKg', 'estimatedVolumeCubicMeters', 'loadingAssistanceRequested'],
      interaction: 'compact_controls_for_call_speed'
    },
    {
      id: 'quote',
      label: 'Quote',
      fields: ['distanceKm', 'etaMinutes', 'priceBreakdown', 'searchRadiusUsed'],
      interaction: 'upfront_price_before_offer_dispatch'
    },
    {
      id: 'candidates',
      label: 'Trucks',
      fields: ['vehicleClass', 'distanceKm', 'rating', 'rankingSignals'],
      interaction: 'sort_by_recommendation_with_distance_visible'
    }
  ],
  emptyStates: {
    noNearbyTrucks: {
      title: 'No nearby approved trucks',
      recoveryActions: ['expand_radius', 'try_alternative_vehicle_class', 'save_draft']
    },
    routeProviderUnavailable: {
      title: 'Route estimate unavailable',
      recoveryActions: ['retry_route', 'adjust_pins', 'ask_assistant']
    }
  },
  visualDirection: {
    layout: 'map_summary_over_form_stack',
    density: 'high',
    colorUsage: 'status_accents_over_neutral_surfaces',
    avoids: ['marketing_hero', 'decorative_gradient_cards', 'optimistic_acceptance']
  }
};

export const candidateResultCardFields = [
  'vehicleClassSnapshot',
  'distanceKm',
  'etaMinutes',
  'totalEstimate',
  'ownerRating',
  'availabilityFreshness',
  'verificationBadge'
];

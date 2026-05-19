export const adminPricingWorkspace = {
  route: '/admin/pricing',
  tone: 'operations-console',
  tableColumns: ['version', 'status', 'effectiveFrom', 'vehicleClassCount', 'fuelSurchargePercent'],
  editorSections: [
    {
      id: 'vehicle-class-rates',
      fields: ['vehicleClassId', 'baseFare', 'perKmRate', 'minimumFare', 'includedMinutes', 'perExtraMinuteRate']
    },
    {
      id: 'load-adjustments',
      fields: ['itemType', 'flatFee', 'multiplier']
    },
    {
      id: 'activation',
      fields: ['status', 'effectiveFrom', 'reason']
    }
  ],
  decisionRules: [
    'active_rules_are_versioned',
    'historical_quote_snapshots_do_not_change',
    'activation_is_admin_only'
  ],
  visualDirection: {
    layout: 'filterable_table_with_side_panel_editor',
    density: 'compact',
    colorUsage: 'reserved_status_color',
    avoids: ['large_cards_inside_cards', 'sales_dashboard_gloss', 'purple_gradient_theme']
  }
};

export const createDefaultPricingRule = ({ vehicleClasses, createdByAdminId = 'system' }) => ({
  id: 'price_rule_default_v1',
  version: 1,
  status: 'active',
  currency: 'ETB',
  vehicleClassRules: vehicleClasses.map((vehicleClass) => ({
    vehicleClassId: vehicleClass.id,
    baseFare: vehicleClass.defaultPricing.baseFare,
    perKmRate: vehicleClass.defaultPricing.perKmRate,
    minimumFare: vehicleClass.defaultPricing.minimumFare,
    includedMinutes: vehicleClass.defaultPricing.includedMinutes ?? 30,
    perExtraMinuteRate: vehicleClass.defaultPricing.perExtraMinuteRate ?? 10
  })),
  loadAdjustments: [
    {
      itemType: 'household_move',
      flatFee: 300
    },
    {
      itemType: 'furniture',
      flatFee: 150
    },
    {
      itemType: 'appliance',
      flatFee: 120
    },
    {
      itemType: 'business_delivery',
      multiplier: 1.1
    }
  ],
  fuelSurchargePercent: 5,
  effectiveFrom: new Date().toISOString(),
  createdByAdminId
});

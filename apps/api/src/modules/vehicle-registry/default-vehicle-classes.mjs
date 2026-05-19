export const defaultVehicleClasses = [
  {
    slug: 'small-pickup',
    name: 'Small Pickup',
    description: 'Light pickup suitable for appliances, boxes, and small furniture.',
    capacityKg: 700,
    capacityCubicMeters: 5,
    defaultPricing: {
      baseFare: 600,
      perKmRate: 45,
      minimumFare: 900
    },
    active: true,
    displayOrder: 10
  },
  {
    slug: 'medium-truck',
    name: 'Medium Truck',
    description: 'Medium truck suitable for household relocation and bulky goods.',
    capacityKg: 2000,
    capacityCubicMeters: 15,
    defaultPricing: {
      baseFare: 1200,
      perKmRate: 75,
      minimumFare: 1800
    },
    active: true,
    displayOrder: 20
  },
  {
    slug: 'large-truck',
    name: 'Large Truck',
    description: 'Large truck for heavier moves, equipment, and small business stock.',
    capacityKg: 5000,
    capacityCubicMeters: 30,
    defaultPricing: {
      baseFare: 2200,
      perKmRate: 120,
      minimumFare: 3200
    },
    active: true,
    displayOrder: 30
  }
];

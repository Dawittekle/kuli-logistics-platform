export interface VehicleTier {
  slug: string;
  name: string;
  category: string;
  description: string;
  capacityKg: number;
  capacityCubicMeters: number;
  baseFare: number;
  perKmRate: number;
  minimumFare: number;
  exampleModels: string;
  recommendedFor: string;
}

export const VEHICLE_TIERS: VehicleTier[] = [
  {
    slug: 'small-pickup',
    name: 'Small Pickup',
    category: '1.0 – 1.5 Ton',
    description: 'Light pickup for appliances, single furniture pieces, boxes, and retail stock.',
    capacityKg: 1000,
    capacityCubicMeters: 5,
    baseFare: 600,
    perKmRate: 45,
    minimumFare: 900,
    exampleModels: 'Bedford KB26, Suzuki Carry, Toyota Hilux',
    recommendedFor: 'Studio moves, single beds, washing machines'
  },
  {
    slug: 'medium-truck',
    name: 'Medium Flatbed / Van',
    category: '3.5 – 4.5 Ton',
    description: 'Most popular for full home relocations, office shifts, and bulk wholesale goods.',
    capacityKg: 4000,
    capacityCubicMeters: 18,
    baseFare: 1200,
    perKmRate: 75,
    minimumFare: 1800,
    exampleModels: 'Isuzu NPR, Mitsubishi Canter, Box Van',
    recommendedFor: '2-3 bedroom apartments, wholesale freight'
  },
  {
    slug: 'large-truck',
    name: 'Heavy Freight Truck',
    category: '7.0 – 15.0 Ton',
    description: 'Heavy multi-ton truck for construction materials, machinery, and factory distribution.',
    capacityKg: 10000,
    capacityCubicMeters: 35,
    baseFare: 2200,
    perKmRate: 120,
    minimumFare: 3200,
    exampleModels: 'Isuzu FSR, Sino Truck Dumper, Heavy Flatbed',
    recommendedFor: 'Construction sites, steel, industrial pallets'
  }
];

export interface FleetVehicle {
  id: string;
  name: string;
  modelName: string;
  tonnage: string;
  payload: string;
  dimensions: string;
  volume: string;
  badge?: string;
  badgeVariant?: 'accent' | 'primary' | 'neutral';
  description: string;
  baseFare: number;
  perKmRate: number;
  idealFor: string[];
  vehicleTierSlug: 'small-pickup' | 'medium-truck' | 'large-truck';
  svgIcon: string;
}

export const FLEET_CATALOG: FleetVehicle[] = [
  {
    id: 'bedford-pickup',
    name: 'Small Pickup',
    modelName: 'Bedford KB26 / Hilux / Carry',
    tonnage: '1.0 – 1.5 Ton',
    payload: 'Up to 1,500 kg',
    dimensions: '2.4m × 1.6m open bed',
    volume: '5.2 m³ open cargo space',
    description: 'Agile light pickup perfect for navigating narrow residential streets and bustling market alleys in Merkato and Piassa.',
    baseFare: 600,
    perKmRate: 45,
    idealFor: [
      'Studio apartment & single room moves',
      'Refrigerator, washing machine, sofa',
      'Retail inventory & market stall deliveries',
      'Quick city-center express transport'
    ],
    vehicleTierSlug: 'small-pickup',
    svgIcon: 'pickup'
  },
  {
    id: 'cargo-van',
    name: 'Closed Cargo Van',
    modelName: 'Toyota HiAce / Sprinter Van',
    tonnage: '1.5 – 2.0 Ton',
    payload: 'Up to 2,000 kg',
    dimensions: '3.2m × 1.8m × 1.6m enclosed',
    volume: '9.2 m³ fully weatherproof',
    description: 'Fully enclosed, lockable van protecting valuable or weather-sensitive shipments from heavy rain, dust, and transit handling.',
    baseFare: 800,
    perKmRate: 55,
    idealFor: [
      'Delicate electronics & appliances',
      'Rainy season (Kiremt) safe transport',
      'Catering equipment & packaged food',
      'Boxed retail merchandise & textiles'
    ],
    vehicleTierSlug: 'small-pickup',
    svgIcon: 'van'
  },
  {
    id: 'isuzu-npr',
    name: 'Medium Flatbed / Box Truck',
    modelName: 'Isuzu NPR / Mitsubishi Canter',
    tonnage: '3.5 – 4.5 Ton',
    payload: 'Up to 4,500 kg',
    dimensions: '4.5m × 2.1m high-sided flatbed',
    volume: '18.5 m³ high capacity',
    badge: 'MOST POPULAR',
    badgeVariant: 'accent',
    description: "Addis Ababa's standard commercial workhorse. Heavy-duty suspension designed for full residential moves and warehouse distribution.",
    baseFare: 1200,
    perKmRate: 75,
    idealFor: [
      '2–3 bedroom full house relocations',
      'Commercial wholesale distribution',
      'Office relocations & corporate workstations',
      'Heavy furniture & warehouse pallets'
    ],
    vehicleTierSlug: 'medium-truck',
    svgIcon: 'medium-flatbed'
  },
  {
    id: 'sino-dumper',
    name: 'Heavy Freight & Tipper',
    modelName: 'Sino Truck / Isuzu FSR Tipper',
    tonnage: '10 – 15 Ton',
    payload: 'Up to 12,000 kg',
    dimensions: '5.6m × 2.3m hydraulic tipper',
    volume: '18.0 m³ heavy load box',
    badge: 'HEAVY HAUL',
    badgeVariant: 'neutral',
    description: 'Heavy multi-ton carrier and hydraulic tipping dump truck for construction aggregates, industrial building materials, and bulk freight.',
    baseFare: 2200,
    perKmRate: 120,
    idealFor: [
      'Construction sand, gravel & aggregates',
      'Bulk cement bags & structural steel',
      'Industrial machinery & heavy plant cargo',
      'Factory raw materials across industrial zones'
    ],
    vehicleTierSlug: 'large-truck',
    svgIcon: 'heavy-truck'
  }
];

export interface CargoItem {
  id: string;
  name: string;
  category: 'living-room' | 'bedroom' | 'appliances' | 'boxes' | 'commercial';
  categoryLabel: string;
  volumeM3: number;
  weightKg: number;
  icon: string;
  description?: string;
}

export const CARGO_CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'living-room', label: 'Living Room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'appliances', label: 'Kitchen & Appliances' },
  { id: 'boxes', label: 'Boxes & Crates' },
  { id: 'commercial', label: 'Commercial & Bulk' }
] as const;

export const CARGO_CATALOG: CargoItem[] = [
  // Living Room
  {
    id: 'sofa-3-seater',
    name: '3-Seater Sofa / Couch',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 1.8,
    weightKg: 65,
    icon: '🛋️',
    description: 'Standard 3-person fabric or leather couch'
  },
  {
    id: 'sofa-2-seater',
    name: '2-Seater Loveseat',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 1.2,
    weightKg: 45,
    icon: '🛋️',
    description: 'Compact 2-person living room sofa'
  },
  {
    id: 'armchair',
    name: 'Armchair / Recliner',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 0.6,
    weightKg: 22,
    icon: '🪑',
    description: 'Single lounge chair or soft recliner'
  },
  {
    id: 'dining-table',
    name: 'Dining Table (6-seater)',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 1.2,
    weightKg: 38,
    icon: '🍽️',
    description: 'Wood or glass dining table'
  },
  {
    id: 'dining-chair',
    name: 'Dining Chair',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 0.2,
    weightKg: 7,
    icon: '🪑',
    description: 'Standard wooden or metal dining chair'
  },
  {
    id: 'coffee-table',
    name: 'Coffee / Center Table',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 0.35,
    weightKg: 14,
    icon: '🪵',
    description: 'Living room center table or side table'
  },
  {
    id: 'tv-console',
    name: 'TV Unit & Entertainment Stand',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 0.8,
    weightKg: 32,
    icon: '📺',
    description: 'Media console and TV bench up to 65"'
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf / Display Cabinet',
    category: 'living-room',
    categoryLabel: 'Living Room',
    volumeM3: 1.1,
    weightKg: 42,
    icon: '📚',
    description: 'Multi-tier storage or display unit'
  },

  // Bedroom
  {
    id: 'bed-king-queen',
    name: 'King / Queen Bed & Mattress',
    category: 'bedroom',
    categoryLabel: 'Bedroom',
    volumeM3: 2.2,
    weightKg: 75,
    icon: '🛏️',
    description: 'Bed frame, headboard and thick mattress'
  },
  {
    id: 'bed-single',
    name: 'Single / Twin Bed & Mattress',
    category: 'bedroom',
    categoryLabel: 'Bedroom',
    volumeM3: 1.2,
    weightKg: 38,
    icon: '🛏️',
    description: 'Single bed frame and mattress'
  },
  {
    id: 'wardrobe-3-door',
    name: '3-Door Wardrobe Closet',
    category: 'bedroom',
    categoryLabel: 'Bedroom',
    volumeM3: 2.5,
    weightKg: 95,
    icon: '🚪',
    description: 'Large clothing closet (disassembled or intact)'
  },
  {
    id: 'wardrobe-2-door',
    name: '2-Door Wardrobe Closet',
    category: 'bedroom',
    categoryLabel: 'Bedroom',
    volumeM3: 1.6,
    weightKg: 62,
    icon: '🚪',
    description: 'Medium 2-door bedroom wardrobe'
  },
  {
    id: 'dresser-drawers',
    name: 'Chest of Drawers / Dresser',
    category: 'bedroom',
    categoryLabel: 'Bedroom',
    volumeM3: 0.9,
    weightKg: 36,
    icon: '🗄️',
    description: '4-6 drawer clothing chest with mirror'
  },
  {
    id: 'bedside-table',
    name: 'Bedside Nightstand',
    category: 'bedroom',
    categoryLabel: 'Bedroom',
    volumeM3: 0.2,
    weightKg: 10,
    icon: '🪵',
    description: 'Small bedside drawer or lamp table'
  },

  // Kitchen & Appliances
  {
    id: 'fridge-double',
    name: 'Double-Door Refrigerator',
    category: 'appliances',
    categoryLabel: 'Kitchen & Appliances',
    volumeM3: 1.4,
    weightKg: 78,
    icon: '🧊',
    description: 'Large tall fridge with freezer compartment'
  },
  {
    id: 'fridge-single',
    name: 'Single-Door Refrigerator',
    category: 'appliances',
    categoryLabel: 'Kitchen & Appliances',
    volumeM3: 0.8,
    weightKg: 46,
    icon: '🧊',
    description: 'Compact or medium single-door fridge'
  },
  {
    id: 'washing-machine',
    name: 'Automatic Washing Machine',
    category: 'appliances',
    categoryLabel: 'Kitchen & Appliances',
    volumeM3: 0.6,
    weightKg: 68,
    icon: '🧺',
    description: 'Front or top-load laundry washer'
  },
  {
    id: 'cooking-stove',
    name: 'Oven Range / Gas Cooker',
    category: 'appliances',
    categoryLabel: 'Kitchen & Appliances',
    volumeM3: 0.65,
    weightKg: 52,
    icon: '🍳',
    description: '4-burner stove and oven appliance'
  },
  {
    id: 'microwave',
    name: 'Microwave / Toaster Oven',
    category: 'appliances',
    categoryLabel: 'Kitchen & Appliances',
    volumeM3: 0.15,
    weightKg: 14,
    icon: '🍲',
    description: 'Countertop kitchen microwave appliance'
  },

  // Boxes & Crates
  {
    id: 'box-standard',
    name: 'Standard Moving Box (Medium)',
    category: 'boxes',
    categoryLabel: 'Boxes & Crates',
    volumeM3: 0.1,
    weightKg: 16,
    icon: '📦',
    description: '50cm × 40cm × 40cm packing box'
  },
  {
    id: 'box-wardrobe',
    name: 'Tall Wardrobe Box with Bar',
    category: 'boxes',
    categoryLabel: 'Boxes & Crates',
    volumeM3: 0.4,
    weightKg: 24,
    icon: '👔',
    description: 'Hanging clothes box preventing wrinkles'
  },
  {
    id: 'box-fragile',
    name: 'Fragile Dish & Glass Pack',
    category: 'boxes',
    categoryLabel: 'Boxes & Crates',
    volumeM3: 0.12,
    weightKg: 18,
    icon: '🍷',
    description: 'Reinforced partitioned box for dinnerware'
  },
  {
    id: 'luggage-suitcase',
    name: 'Travel Luggage / Suitcase',
    category: 'boxes',
    categoryLabel: 'Boxes & Crates',
    volumeM3: 0.18,
    weightKg: 22,
    icon: '🧳',
    description: 'Large travel trunk or wheeled suitcase'
  },

  // Commercial & Bulk
  {
    id: 'pallet-standard',
    name: 'Standard Wooden Cargo Pallet',
    category: 'commercial',
    categoryLabel: 'Commercial & Bulk',
    volumeM3: 1.5,
    weightKg: 450,
    icon: '🪵',
    description: '1.2m × 1.0m pallet loaded with merchandise'
  },
  {
    id: 'commercial-carton',
    name: 'Wholesale Merchandise Carton',
    category: 'commercial',
    categoryLabel: 'Commercial & Bulk',
    volumeM3: 0.25,
    weightKg: 28,
    icon: '📦',
    description: 'Commercial wholesale stock / textile carton'
  },
  {
    id: 'cement-construction',
    name: 'Cement / Building Bags (Pack of 5)',
    category: 'commercial',
    categoryLabel: 'Commercial & Bulk',
    volumeM3: 0.18,
    weightKg: 250,
    icon: '🏗️',
    description: 'Five 50kg bags of cement, plaster, or aggregate'
  },
  {
    id: 'machinery-crate',
    name: 'Industrial Equipment Crate',
    category: 'commercial',
    categoryLabel: 'Commercial & Bulk',
    volumeM3: 1.8,
    weightKg: 480,
    icon: '⚙️',
    description: 'Reinforced timber crate for machinery / pumps'
  }
];

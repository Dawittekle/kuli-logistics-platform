import { MongoClient } from 'mongodb';

const mongodbUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27018/kuli';
const clientCount = Number(process.env.FAKE_CLIENTS ?? 12);
const ownerCount = Number(process.env.FAKE_OWNERS ?? 18);
const now = new Date().toISOString();

const defaultVehicleClasses = [
  {
    _id: 'vcls_small-pickup',
    slug: 'small-pickup',
    name: 'Small Pickup',
    description: 'Light pickup suitable for appliances, boxes, and small furniture.',
    capacityKg: 700,
    capacityCubicMeters: 5,
    defaultPricing: { baseFare: 600, perKmRate: 45, minimumFare: 900 },
    active: true,
    displayOrder: 10
  },
  {
    _id: 'vcls_medium-truck',
    slug: 'medium-truck',
    name: 'Medium Truck',
    description: 'Medium truck suitable for household relocation and bulky goods.',
    capacityKg: 2000,
    capacityCubicMeters: 15,
    defaultPricing: { baseFare: 1200, perKmRate: 75, minimumFare: 1800 },
    active: true,
    displayOrder: 20
  },
  {
    _id: 'vcls_large-truck',
    slug: 'large-truck',
    name: 'Large Truck',
    description: 'Large truck for heavier moves, equipment, and small business stock.',
    capacityKg: 5000,
    capacityCubicMeters: 30,
    defaultPricing: { baseFare: 2200, perKmRate: 120, minimumFare: 3200 },
    active: true,
    displayOrder: 30
  }
];

const createUser = ({ id, role, fullName, phone, index }) => ({
  _id: id,
  supabaseUserId: id,
  role,
  accountStatus: 'active',
  fullName,
  email: `${id}@demo.kuli.local`,
  phone,
  notificationPreferences: {
    push: true,
    sms: true,
    email: true,
    marketing: false
  },
  ...(role === 'truck_owner'
    ? {
        truckOwnerMeta: {
          averageRating: Number((4.1 + (index % 8) * 0.1).toFixed(1)),
          ratingCount: 8 + index,
          completedTrips: 18 + index,
          totalTrips: 20 + index,
          visibilityPenaltyScore: index % 7 === 0 ? 2 : 0
        }
      }
    : {}),
  ...(role === 'admin' || role === 'assistant'
    ? {
        staffMeta: {
          createdByAdminId: 'local_demo'
        }
      }
    : {}),
  createdAt: now,
  updatedAt: now
});

const addisPoints = [
  { addressText: 'Bole, Addis Ababa', coordinates: [38.7892, 8.9806] },
  { addressText: 'Megenagna, Addis Ababa', coordinates: [38.8024, 9.0192] },
  { addressText: 'Mexico Square, Addis Ababa', coordinates: [38.7468, 9.0092] },
  { addressText: 'Piassa, Addis Ababa', coordinates: [38.7578, 9.0367] },
  { addressText: 'Saris, Addis Ababa', coordinates: [38.7647, 8.9448] },
  { addressText: 'CMC, Addis Ababa', coordinates: [38.8549, 9.0255] }
];

const client = new MongoClient(mongodbUri);
await client.connect();
const db = client.db();

for (const vehicleClass of defaultVehicleClasses) {
  await db.collection('vehicle_classes').replaceOne(
    { _id: vehicleClass._id },
    {
      ...vehicleClass,
      createdAt: now,
      updatedAt: now
    },
    { upsert: true }
  );
}

const activeRule = await db.collection('pricing_rules').findOne({ status: 'active' });

if (!activeRule) {
  await db.collection('pricing_rules').replaceOne(
    { _id: 'price_rule_demo_active' },
    {
      _id: 'price_rule_demo_active',
      version: 1,
      status: 'active',
      currency: 'ETB',
      vehicleClassRules: defaultVehicleClasses.map((vehicleClass) => ({
        vehicleClassId: vehicleClass._id,
        baseFare: vehicleClass.defaultPricing.baseFare,
        perKmRate: vehicleClass.defaultPricing.perKmRate,
        minimumFare: vehicleClass.defaultPricing.minimumFare,
        includedMinutes: 20,
        perExtraMinuteRate: 8
      })),
      loadAdjustments: [
        { itemType: 'household_move', flatFee: 200, multiplier: 1 },
        { itemType: 'fragile', flatFee: 350, multiplier: 1.1 },
        { itemType: 'construction_material', flatFee: 500, multiplier: 1.15 }
      ],
      fuelSurchargePercent: 5,
      effectiveFrom: now,
      createdByAdminId: 'local_demo',
      createdAt: now,
      updatedAt: now
    },
    { upsert: true }
  );
}

const users = [];
const vehicles = [];
const tickets = [];

users.push(createUser({
  id: 'demo-admin-001',
  role: 'admin',
  fullName: 'Demo Admin',
  phone: '+251930300001',
  index: 1
}));

users.push(createUser({
  id: 'demo-assistant-001',
  role: 'assistant',
  fullName: 'Demo Assistant',
  phone: '+251930300002',
  index: 2
}));

for (let index = 1; index <= clientCount; index += 1) {
  users.push(createUser({
    id: `demo-client-${String(index).padStart(3, '0')}`,
    role: 'client',
    fullName: `Demo Client ${index}`,
    phone: `+25191010${String(index).padStart(4, '0')}`,
    index
  }));
}

for (let index = 1; index <= ownerCount; index += 1) {
  const ownerId = `demo-owner-${String(index).padStart(3, '0')}`;
  const vehicleClass = defaultVehicleClasses[index % defaultVehicleClasses.length];
  const point = addisPoints[index % addisPoints.length];

  users.push(createUser({
    id: ownerId,
    role: 'truck_owner',
    fullName: `Demo Owner ${index}`,
    phone: `+25192020${String(index).padStart(4, '0')}`,
    index
  }));

  vehicles.push({
    _id: `demo-vehicle-${String(index).padStart(3, '0')}`,
    ownerId,
    vehicleClassId: vehicleClass._id,
    vehicleClassSnapshot: {
      slug: vehicleClass.slug,
      name: vehicleClass.name
    },
    licensePlate: `DEMO-${String(index).padStart(4, '0')}`,
    capacityKg: vehicleClass.capacityKg,
    capacityCubicMeters: vehicleClass.capacityCubicMeters,
    description: `Demo ${vehicleClass.name.toLowerCase()} staged near ${point.addressText}.`,
    verificationStatus: index % 5 === 0 ? 'pending' : 'approved',
    verificationSubmittedAt: now,
    verifiedAt: index % 5 === 0 ? undefined : now,
    verifiedByAdminId: index % 5 === 0 ? undefined : 'local_demo',
    availabilityStatus: index % 5 === 0 ? 'offline' : index % 4 === 0 ? 'under_maintenance' : 'online_available',
    currentLocation: {
      addressText: point.addressText,
      source: 'manual_pin',
      point: {
        type: 'Point',
        coordinates: point.coordinates
      }
    },
    currentLocationUpdatedAt: now,
    documentsRequired: ['identity', 'driver_license', 'vehicle_registration', 'ownership_proof', 'insurance'],
    createdAt: now,
    updatedAt: now
  });
}

for (let index = 1; index <= 4; index += 1) {
  const point = addisPoints[index % addisPoints.length];

  tickets.push({
    _id: `demo-ticket-${String(index).padStart(3, '0')}`,
    ticketCode: `TKT-FAKE-${String(index).padStart(3, '0')}`,
    source: index % 2 === 0 ? 'incoming_call' : 'manual',
    status: index === 1 ? 'open' : index === 2 ? 'assigned' : 'pending_client',
    callerPhone: `+25194040${String(index).padStart(4, '0')}`,
    customerName: `Walk-in Caller ${index}`,
    pickupLocation: point,
    dropoffLocation: addisPoints[(index + 2) % addisPoints.length],
    requestedVehicleClassId: defaultVehicleClasses[index % defaultVehicleClasses.length]._id,
    callSummary: `Demo assisted booking scenario ${index}.`,
    assignedAssistantId: index === 2 ? 'demo-assistant-001' : undefined,
    createdByAssistantId: 'demo-assistant-001',
    createdAt: now,
    updatedAt: now
  });
}

for (const user of users) {
  await db.collection('users').replaceOne({ _id: user._id }, user, { upsert: true });
}

for (const vehicle of vehicles) {
  await db.collection('vehicles').replaceOne({ _id: vehicle._id }, vehicle, { upsert: true });
}

for (const ticket of tickets) {
  await db.collection('hotline_tickets').replaceOne({ _id: ticket._id }, ticket, { upsert: true });
}

await client.close();

console.log(`seed: fake users upserted (${clientCount} clients, ${ownerCount} owners, 1 admin, 1 assistant)`);
console.log(`seed: fake records upserted (${vehicles.length} vehicles, ${tickets.length} hotline tickets)`);
console.log('seed: use Bearer dev:demo-client-001, dev:demo-owner-001, dev:demo-admin-001, or dev:demo-assistant-001 with DEMO_AUTH_ENABLED=true');

import { MongoClient } from 'mongodb';
import { env } from '../apps/api/src/config/env.mjs';
import { defaultVehicleClasses } from '../apps/api/src/modules/vehicle-registry/default-vehicle-classes.mjs';
import { createDefaultPricingRule } from '../apps/api/src/modules/logistics/default-pricing-rule.mjs';

if (process.env.RESET_KULI_DB_CONFIRM !== 'reset') {
  console.error('Refusing to reset MongoDB. Re-run with RESET_KULI_DB_CONFIRM=reset.');
  process.exit(1);
}

const now = new Date().toISOString();
const client = new MongoClient(env.mongodbUri, {
  serverSelectionTimeoutMS: env.mongodbServerSelectionTimeoutMs
});

const cleanPhone = (value) => (value ? value : undefined);

const createUser = ({ id, supabaseUserId, role, fullName, email, phone, activeVehicleId }) => ({
  _id: id,
  supabaseUserId,
  role,
  accountStatus: 'active',
  fullName,
  email,
  phone: cleanPhone(phone),
  activeVehicleId,
  notificationPreferences: {
    push: true,
    sms: true,
    email: true,
    marketing: false
  },
  ...(role === 'truck_owner'
    ? {
        truckOwnerMeta: {
          averageRating: 4.8,
          ratingCount: 8,
          completedTrips: 12,
          totalTrips: 12,
          visibilityPenaltyScore: 0
        }
      }
    : {}),
  ...(role === 'admin' || role === 'assistant'
    ? {
        staffMeta: {
          createdByAdminId: role === 'admin' ? null : 'usr_admin_seed',
          lastPrivilegedLoginAt: null
        }
      }
    : {}),
  createdAt: now,
  updatedAt: now
});

const createVehicle = ({ id, ownerId, vehicleClass, licensePlate, point, description }) => ({
  _id: id,
  ownerId,
  vehicleClassId: vehicleClass._id,
  vehicleClassSnapshot: {
    slug: vehicleClass.slug,
    name: vehicleClass.name
  },
  licensePlate,
  capacityKg: vehicleClass.capacityKg,
  capacityCubicMeters: vehicleClass.capacityCubicMeters,
  description,
  verificationStatus: 'approved',
  verificationSubmittedAt: now,
  verifiedAt: now,
  verifiedByAdminId: 'usr_admin_seed',
  availabilityStatus: 'online_available',
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

const appCollections = [
  'users',
  'vehicles',
  'vehicle_classes',
  'pricing_rules',
  'kuli_requests',
  'trip_offers',
  'kuli_status_events',
  'trip_messages',
  'notifications',
  'notification_intents',
  'device_tokens',
  'payments',
  'ratings',
  'reports',
  'files',
  'vehicle_documents',
  'vehicle_documents.files',
  'vehicle_documents.chunks',
  'audit_logs',
  'hotline_tickets'
];

await client.connect();
const db = client.db();

for (const collectionName of appCollections) {
  await db.collection(collectionName).deleteMany({});
}

const vehicleClasses = defaultVehicleClasses.map((vehicleClass) => ({
  _id: `vcls_${vehicleClass.slug}`,
  ...vehicleClass,
  createdAt: now,
  updatedAt: now
}));

await db.collection('vehicle_classes').insertMany(vehicleClasses);

const pricingRule = createDefaultPricingRule({
  vehicleClasses: vehicleClasses.map(({ _id, ...vehicleClass }) => ({ id: _id, ...vehicleClass })),
  createdByAdminId: 'usr_admin_seed'
});

await db.collection('pricing_rules').insertOne({
  _id: pricingRule.id,
  ...Object.fromEntries(Object.entries(pricingRule).filter(([key]) => key !== 'id')),
  createdAt: now,
  updatedAt: now
});

const users = [
  createUser({
    id: 'usr_admin_seed',
    supabaseUserId: env.bootstrapAdminSupabaseUserId || 'seed-admin-supabase-id',
    role: 'admin',
    fullName: env.bootstrapAdminFullName || 'KULI Admin',
    email: env.bootstrapAdminEmail || 'admin@kuli.local'
  }),
  createUser({
    id: 'usr_seed_client_client4',
    supabaseUserId: 'seed-client-client4-gmail-com',
    role: 'client',
    fullName: 'Client Four',
    email: 'client4@gmail.com',
    phone: '+251911000004'
  }),
  createUser({
    id: 'usr_seed_client_temp',
    supabaseUserId: 'seed-client-temp31549-gmail-com',
    role: 'client',
    fullName: 'Temp Client',
    email: 'temp31549@gmail.com',
    phone: '+251902468877'
  }),
  createUser({
    id: 'usr_seed_owner_one',
    supabaseUserId: 'seed-owner-owner1-gmail-com',
    role: 'truck_owner',
    fullName: 'Owner One',
    email: 'owner1@gmail.com',
    phone: '+251920200001',
    activeVehicleId: 'veh_seed_owner_one'
  }),
  createUser({
    id: 'usr_seed_owner_two',
    supabaseUserId: 'seed-owner-owner2-gmail-com',
    role: 'truck_owner',
    fullName: 'Owner Two',
    email: 'owner2@gmail.com',
    phone: '+251920200002',
    activeVehicleId: 'veh_seed_owner_two'
  })
];

if (process.env.SEED_ASSISTANT_SUPABASE_USER_ID && process.env.SEED_ASSISTANT_EMAIL) {
  users.push(
    createUser({
      id: 'usr_seed_assistant',
      supabaseUserId: process.env.SEED_ASSISTANT_SUPABASE_USER_ID,
      role: 'assistant',
      fullName: process.env.SEED_ASSISTANT_FULL_NAME || 'KULI Assistant',
      email: process.env.SEED_ASSISTANT_EMAIL,
      phone: process.env.SEED_ASSISTANT_PHONE
    })
  );
}

await db.collection('users').insertMany(users);

const mediumTruck = vehicleClasses.find((vehicleClass) => vehicleClass.slug === 'medium-truck');
const largeTruck = vehicleClasses.find((vehicleClass) => vehicleClass.slug === 'large-truck');

await db.collection('vehicles').insertMany([
  createVehicle({
    id: 'veh_seed_owner_one',
    ownerId: 'usr_seed_owner_one',
    vehicleClass: mediumTruck,
    licensePlate: 'AA-1201',
    point: { addressText: 'Bole, Addis Ababa', coordinates: [38.7892, 8.9806] },
    description: 'Clean medium truck staged near Bole for household and furniture moves.'
  }),
  createVehicle({
    id: 'veh_seed_owner_two',
    ownerId: 'usr_seed_owner_two',
    vehicleClass: largeTruck,
    licensePlate: 'AA-2202',
    point: { addressText: 'Megenagna, Addis Ababa', coordinates: [38.8024, 9.0192] },
    description: 'Large truck staged near Megenagna for business goods and heavy moves.'
  })
]);

await db.collection('hotline_tickets').insertOne({
  _id: 'tkt_seed_manual',
  ticketCode: 'TKT-SEED-001',
  source: 'manual',
  status: 'open',
  callerPhone: '+251940400001',
  customerName: 'Starter Caller',
  callSummary: 'Starter support ticket for assistant dashboard smoke testing.',
  createdAt: now,
  updatedAt: now
});

await client.close();

console.log('reset: MongoDB KULI collections cleared and reseeded.');
console.log(`reset: users=${users.length}, vehicleClasses=${vehicleClasses.length}, vehicles=2, pricingRules=1, tickets=1`);
console.log('reset: client4@gmail.com/temp31549@gmail.com will relink to their current Supabase IDs on login.');

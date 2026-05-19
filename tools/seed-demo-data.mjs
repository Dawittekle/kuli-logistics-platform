import { MongoClient } from 'mongodb';

const mongodbUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27018/kuli';
const now = new Date().toISOString();
const records = {
  users: [
    {
      _id: 'demo_client',
      supabaseUserId: 'demo-client',
      role: 'client',
      accountStatus: 'active',
      fullName: 'Demo Client',
      phone: '+251900000001',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: 'demo_owner',
      supabaseUserId: 'demo-owner',
      role: 'truck_owner',
      accountStatus: 'active',
      fullName: 'Demo Truck Owner',
      phone: '+251900000002',
      truckOwnerMeta: {
        averageRating: 4.7,
        ratingCount: 12,
        completedTrips: 20,
        totalTrips: 22,
        visibilityPenaltyScore: 0
      },
      createdAt: now,
      updatedAt: now
    }
  ],
  vehicles: [
    {
      _id: 'demo_vehicle_approved',
      ownerId: 'demo_owner',
      vehicleClassId: 'vcls_medium-truck',
      vehicleClassSnapshot: {
        slug: 'medium-truck',
        name: 'Medium Truck'
      },
      licensePlate: 'AA DEMO 001',
      verificationStatus: 'approved',
      availabilityStatus: 'online_available',
      currentLocation: {
        point: { type: 'Point', coordinates: [38.7892, 8.9806] },
        addressText: 'Bole, Addis Ababa'
      },
      createdAt: now,
      updatedAt: now
    }
  ],
  hotline_tickets: [
    {
      _id: 'demo_ticket_open',
      ticketCode: 'TKT-DEMO-001',
      status: 'open',
      callerPhone: '+251900000003',
      source: 'missed_call',
      callSummary: 'Demo missed call for assisted booking.',
      createdAt: now,
      updatedAt: now
    }
  ]
};

const client = new MongoClient(mongodbUri);
await client.connect();
const db = client.db();

for (const [collectionName, documents] of Object.entries(records)) {
  const collection = db.collection(collectionName);

  for (const document of documents) {
    await collection.replaceOne(
      { _id: document._id },
      document,
      { upsert: true }
    );
  }
}

await client.close();
console.log('seed: demo data upserted');

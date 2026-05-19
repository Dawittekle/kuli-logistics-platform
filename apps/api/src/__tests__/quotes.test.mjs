import test from 'node:test';
import assert from 'node:assert/strict';
import { roles, vehicleAvailabilityStatuses, verificationStatuses } from '../../../../packages/shared/src/index.mjs';
import { DeterministicMapsProvider } from '../integrations/maps/deterministic-maps-provider.mjs';
import { createDefaultPricingRule } from '../modules/logistics/default-pricing-rule.mjs';
import { QuoteService } from '../modules/logistics/quote-service.mjs';

const client = {
  id: 'usr_client_001',
  role: roles.client
};

const admin = {
  id: 'usr_admin_001',
  role: roles.admin
};

const vehicleClass = {
  id: 'vcls_medium-truck',
  slug: 'medium-truck',
  name: 'Medium Truck',
  capacityKg: 2000,
  capacityCubicMeters: 15,
  defaultPricing: {
    baseFare: 1200,
    perKmRate: 75,
    minimumFare: 1800
  },
  active: true,
  displayOrder: 10
};

const boleLocation = {
  point: { type: 'Point', coordinates: [38.7892, 8.9806] },
  addressText: 'Bole, Addis Ababa',
  source: 'manual_pin'
};

const piyassaLocation = {
  point: { type: 'Point', coordinates: [38.7525, 9.0341] },
  addressText: 'Piyassa, Addis Ababa',
  source: 'manual_pin'
};

class MemoryPricingRuleRepository {
  constructor() {
    this.records = new Map();
  }

  async findActive() {
    return Array.from(this.records.values()).find((record) => record.status === 'active') ?? null;
  }

  async list() {
    return Array.from(this.records.values()).sort((left, right) => right.version - left.version);
  }

  async nextVersion() {
    const versions = Array.from(this.records.values()).map((record) => record.version);
    return versions.length ? Math.max(...versions) + 1 : 1;
  }

  async save(record) {
    this.records.set(record.id, {
      ...record,
      createdAt: record.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return this.records.get(record.id);
  }

  async retireActiveExcept(activeRuleId) {
    for (const [id, record] of this.records.entries()) {
      if (id !== activeRuleId && record.status === 'active') {
        this.records.set(id, {
          ...record,
          status: 'retired',
          effectiveTo: new Date().toISOString()
        });
      }
    }
  }
}

class MemoryVehicleClassRepository {
  async listActive() {
    return [vehicleClass];
  }

  async findById(id) {
    return id === vehicleClass.id ? vehicleClass : null;
  }
}

class MemoryUserRepository {
  async findById(id) {
    return {
      id,
      role: roles.truckOwner,
      truckOwnerMeta: {
        averageRating: id === 'usr_owner_near' ? 4.8 : 3.5,
        totalTrips: 20,
        completedTrips: 18,
        visibilityPenaltyScore: id === 'usr_owner_penalized' ? 20 : 0
      }
    };
  }
}

class MemoryVehicleRepository {
  constructor() {
    this.queries = [];
    this.vehicles = [
      {
        id: 'veh_near',
        ownerId: 'usr_owner_near',
        vehicleClassId: vehicleClass.id,
        vehicleClassSnapshot: { slug: vehicleClass.slug, name: vehicleClass.name },
        licensePlate: 'AA-11111',
        verificationStatus: verificationStatuses.approved,
        availabilityStatus: vehicleAvailabilityStatuses.onlineAvailable,
        currentLocation: {
          point: { type: 'Point', coordinates: [38.7901, 8.981] },
          addressText: 'Bole standby'
        }
      },
      {
        id: 'veh_pending',
        ownerId: 'usr_owner_pending',
        vehicleClassId: vehicleClass.id,
        vehicleClassSnapshot: { slug: vehicleClass.slug, name: vehicleClass.name },
        licensePlate: 'AA-22222',
        verificationStatus: verificationStatuses.pending,
        availabilityStatus: vehicleAvailabilityStatuses.onlineAvailable,
        currentLocation: {
          point: { type: 'Point', coordinates: [38.7899, 8.9809] },
          addressText: 'Bole standby'
        }
      }
    ];
  }

  async findApprovedAvailableNearby({ radiusKm }) {
    this.queries.push(radiusKm);

    if (radiusKm < 20) {
      return [];
    }

    return this.vehicles.filter(
      (vehicle) =>
        vehicle.verificationStatus === verificationStatuses.approved &&
        vehicle.availabilityStatus === vehicleAvailabilityStatuses.onlineAvailable
    );
  }
}

const createService = async () => {
  const pricingRuleRepository = new MemoryPricingRuleRepository();
  const pricingRule = createDefaultPricingRule({
    vehicleClasses: [vehicleClass]
  });
  await pricingRuleRepository.save(pricingRule);

  const vehicleRepository = new MemoryVehicleRepository();
  const service = new QuoteService({
    pricingRuleRepository,
    vehicleClassRepository: new MemoryVehicleClassRepository(),
    vehicleRepository,
    userRepository: new MemoryUserRepository(),
    mapsProvider: new DeterministicMapsProvider()
  });

  return {
    service,
    pricingRuleRepository,
    vehicleRepository
  };
};

test('quote returns route, price breakdown, and expanded candidate search', async () => {
  const { service, vehicleRepository } = await createService();

  const quote = await service.createQuote({
    actor: client,
    input: {
      pickupLocation: boleLocation,
      destinationLocation: piyassaLocation,
      requestedVehicleClassId: vehicleClass.id,
      loadDetails: {
        itemType: 'household_move',
        estimatedWeightKg: 800,
        loadingAssistanceRequested: true
      },
      tip: 50
    }
  });

  assert.equal(quote.quoteSnapshot.currency, 'ETB');
  assert.equal(quote.quoteSnapshot.pricingRuleVersion, 1);
  assert.ok(quote.quoteSnapshot.totalEstimate >= quote.quoteSnapshot.minimumFare);
  assert.equal(quote.search.radiusKmUsed, 20);
  assert.equal(quote.search.expanded, true);
  assert.deepEqual(vehicleRepository.queries, [10, 20]);
  assert.equal(quote.candidates.length, 1);
  assert.equal(quote.candidates[0].vehicleId, 'veh_near');
});

test('pricing snapshots stay stable after active rule changes', async () => {
  const { service } = await createService();

  const firstQuote = await service.createQuote({
    actor: client,
    input: {
      pickupLocation: boleLocation,
      destinationLocation: piyassaLocation,
      requestedVehicleClassId: vehicleClass.id,
      loadDetails: {
        itemType: 'furniture'
      }
    }
  });

  await service.createPricingRule({
    actor: admin,
    input: {
      status: 'active',
      vehicleClassRules: [
        {
          vehicleClassId: vehicleClass.id,
          baseFare: 3000,
          perKmRate: 200,
          minimumFare: 5000
        }
      ],
      loadAdjustments: [],
      fuelSurchargePercent: 0
    }
  });

  const secondQuote = await service.createQuote({
    actor: client,
    input: {
      pickupLocation: boleLocation,
      destinationLocation: piyassaLocation,
      requestedVehicleClassId: vehicleClass.id,
      loadDetails: {
        itemType: 'furniture'
      }
    }
  });

  assert.equal(firstQuote.quoteSnapshot.pricingRuleVersion, 1);
  assert.equal(secondQuote.quoteSnapshot.pricingRuleVersion, 2);
  assert.notEqual(firstQuote.quoteSnapshot.totalEstimate, secondQuote.quoteSnapshot.totalEstimate);
});

import { pricingRuleStatuses, roles } from '../../../../../packages/shared/src/index.mjs';
import { calculateHaversineDistanceKm } from '../../integrations/maps/deterministic-maps-provider.mjs';
import { AppError } from '../../common/errors/app-error.mjs';
import { createDefaultPricingRule } from './default-pricing-rule.mjs';

const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const defaultInitialRadiusKm = 10;
const defaultExpandedRadiusKm = 20;

const assertClientOrAssistant = (user) => {
  if (![roles.client, roles.assistant, roles.admin].includes(user.role)) {
    throw new AppError(403, 'QUOTE_FORBIDDEN', 'Only clients, assistants, and admins can create quotes.');
  }
};

const assertAdmin = (user) => {
  if (user.role !== roles.admin) {
    throw new AppError(403, 'ADMIN_REQUIRED', 'Only admins can manage pricing rules.');
  }
};

const assertLocation = (location, fieldName) => {
  if (!location?.point || location.point.type !== 'Point' || !Array.isArray(location.point.coordinates)) {
    throw new AppError(400, 'LOCATION_REQUIRED', `${fieldName} requires GeoJSON coordinates.`);
  }

  if (!location.addressText) {
    throw new AppError(400, 'LOCATION_ADDRESS_REQUIRED', `${fieldName} requires address text.`);
  }
};

const resolveLoadAdjustment = (pricingRule, itemType) => {
  const adjustment = pricingRule.loadAdjustments.find((entry) => entry.itemType === itemType);

  if (!adjustment) {
    return {
      flatFee: 0,
      multiplier: 1
    };
  }

  return {
    flatFee: adjustment.flatFee ?? 0,
    multiplier: adjustment.multiplier ?? 1
  };
};

const calculatePrice = ({ pricingRule, vehicleClassId, route, loadDetails, tip = 0 }) => {
  const classRule = pricingRule.vehicleClassRules.find((rule) => rule.vehicleClassId === vehicleClassId);

  if (!classRule) {
    throw new AppError(422, 'PRICING_RULE_MISSING_CLASS', 'No active pricing rule exists for this vehicle class.');
  }

  const loadAdjustment = resolveLoadAdjustment(pricingRule, loadDetails.itemType);
  const durationCharge = Math.max(0, route.etaMinutes - (classRule.includedMinutes ?? 0)) * (classRule.perExtraMinuteRate ?? 0);
  const subtotalBeforeMultiplier = classRule.baseFare + route.distanceKm * classRule.perKmRate + durationCharge + loadAdjustment.flatFee;
  const adjustedSubtotal = subtotalBeforeMultiplier * loadAdjustment.multiplier;
  const fuelSurcharge = adjustedSubtotal * ((pricingRule.fuelSurchargePercent ?? 0) / 100);
  const totalBeforeMinimum = adjustedSubtotal + fuelSurcharge + tip;
  const totalEstimate = Math.max(classRule.minimumFare, totalBeforeMinimum);

  return {
    pricingRuleVersion: pricingRule.version,
    currency: pricingRule.currency,
    baseFare: classRule.baseFare,
    distanceKm: route.distanceKm,
    etaMinutes: route.etaMinutes,
    distanceCharge: Number((route.distanceKm * classRule.perKmRate).toFixed(2)),
    durationCharge: Number(durationCharge.toFixed(2)),
    loadAdjustment: Number(loadAdjustment.flatFee.toFixed(2)),
    optionalServicesTotal: 0,
    fuelSurcharge: Number(fuelSurcharge.toFixed(2)),
    tip,
    minimumFare: classRule.minimumFare,
    totalEstimate: Number(totalEstimate.toFixed(2))
  };
};

export class QuoteService {
  constructor({
    pricingRuleRepository,
    vehicleClassRepository,
    vehicleRepository,
    userRepository,
    mapsProvider
  }) {
    this.pricingRuleRepository = pricingRuleRepository;
    this.vehicleClassRepository = vehicleClassRepository;
    this.vehicleRepository = vehicleRepository;
    this.userRepository = userRepository;
    this.mapsProvider = mapsProvider;
  }

  async seedDefaultPricingRule() {
    const existingActive = await this.pricingRuleRepository.findActive();

    if (existingActive) {
      return existingActive;
    }

    const vehicleClasses = await this.vehicleClassRepository.listActive();
    const defaultRule = createDefaultPricingRule({ vehicleClasses });

    return this.pricingRuleRepository.save(defaultRule);
  }

  async listPricingRules({ actor }) {
    assertAdmin(actor);
    return this.pricingRuleRepository.list();
  }

  async createPricingRule({ actor, input }) {
    assertAdmin(actor);

    const version = await this.pricingRuleRepository.nextVersion();
    const pricingRule = {
      id: createId('price_rule'),
      version,
      status: input.status ?? pricingRuleStatuses.draft,
      currency: 'ETB',
      vehicleClassRules: input.vehicleClassRules ?? [],
      loadAdjustments: input.loadAdjustments ?? [],
      fuelSurchargePercent: input.fuelSurchargePercent ?? 0,
      effectiveFrom: input.effectiveFrom ?? new Date().toISOString(),
      createdByAdminId: actor.id
    };

    if (pricingRule.status === pricingRuleStatuses.active) {
      await this.pricingRuleRepository.retireActiveExcept(pricingRule.id);
    }

    return this.pricingRuleRepository.save(pricingRule);
  }

  async activatePricingRule({ actor, pricingRuleId }) {
    assertAdmin(actor);

    const pricingRules = await this.pricingRuleRepository.list();
    const pricingRule = pricingRules.find((rule) => rule.id === pricingRuleId);

    if (!pricingRule) {
      throw new AppError(404, 'PRICING_RULE_NOT_FOUND', 'Pricing rule was not found.');
    }

    await this.pricingRuleRepository.retireActiveExcept(pricingRule.id);

    return this.pricingRuleRepository.save({
      ...pricingRule,
      status: pricingRuleStatuses.active,
      effectiveFrom: new Date().toISOString(),
      effectiveTo: undefined
    });
  }

  async createQuote({ actor, input }) {
    assertClientOrAssistant(actor);
    assertLocation(input.pickupLocation, 'Pickup location');
    assertLocation(input.destinationLocation, 'Destination location');

    const straightLineKm = calculateHaversineDistanceKm(input.pickupLocation.point, input.destinationLocation.point);

    if (straightLineKm === 0) {
      throw new AppError(422, 'INVALID_ROUTE', 'Pickup and destination cannot be identical.');
    }

    const vehicleClass = input.requestedVehicleClassId
      ? await this.vehicleClassRepository.findById(input.requestedVehicleClassId)
      : (await this.vehicleClassRepository.listActive())[0];

    if (!vehicleClass || !vehicleClass.active) {
      throw new AppError(422, 'VEHICLE_CLASS_NOT_AVAILABLE', 'Requested vehicle class is not available.');
    }

    const route = await this.mapsProvider.getRoute(input.pickupLocation.point, input.destinationLocation.point);
    const pricingRule = await this.pricingRuleRepository.findActive();

    if (!pricingRule) {
      throw new AppError(500, 'ACTIVE_PRICING_RULE_MISSING', 'No active pricing rule is configured.');
    }

    const loadDetails = {
      itemType: input.loadDetails?.itemType ?? 'household_move',
      estimatedWeightKg: input.loadDetails?.estimatedWeightKg,
      estimatedVolumeCubicMeters: input.loadDetails?.estimatedVolumeCubicMeters,
      loadingAssistanceRequested: Boolean(input.loadDetails?.loadingAssistanceRequested),
      specialHandlingInstructions: input.loadDetails?.specialHandlingInstructions
    };

    if (loadDetails.estimatedWeightKg && vehicleClass.capacityKg && loadDetails.estimatedWeightKg > vehicleClass.capacityKg) {
      throw new AppError(422, 'LOAD_EXCEEDS_VEHICLE_CLASS', 'Estimated load exceeds the selected vehicle class capacity.');
    }

    const quoteSnapshot = calculatePrice({
      pricingRule,
      vehicleClassId: vehicleClass.id,
      route,
      loadDetails,
      tip: input.tip ?? 0
    });

    const candidates = await this.findCandidateVehicles({
      pickupPoint: input.pickupLocation.point,
      vehicleClassId: vehicleClass.id,
      searchRadiiKm: [input.initialRadiusKm ?? defaultInitialRadiusKm, input.expandedRadiusKm ?? defaultExpandedRadiusKm]
    });

    return {
      quoteId: createId('quote'),
      route,
      requestedVehicleClass: {
        id: vehicleClass.id,
        slug: vehicleClass.slug,
        name: vehicleClass.name
      },
      loadDetails,
      quoteSnapshot,
      search: {
        radiusKmUsed: candidates.radiusKmUsed,
        expanded: candidates.expanded,
        noResults: candidates.results.length === 0
      },
      candidates: candidates.results
    };
  }

  async findCandidateVehicles({ pickupPoint, vehicleClassId, searchRadiiKm }) {
    for (const [index, radiusKm] of searchRadiiKm.entries()) {
      const vehicles = await this.vehicleRepository.findApprovedAvailableNearby({
        point: pickupPoint,
        radiusKm,
        vehicleClassId
      });

      if (vehicles.length === 0) {
        continue;
      }

      const ranked = await Promise.all(
        vehicles.map(async (vehicle) => {
          const owner = await this.userRepository.findById(vehicle.ownerId);
          const distanceKm = calculateHaversineDistanceKm(pickupPoint, vehicle.currentLocation.point);
          const rating = owner?.truckOwnerMeta?.averageRating ?? 0;
          const completionRate =
            owner?.truckOwnerMeta?.totalTrips > 0
              ? owner.truckOwnerMeta.completedTrips / owner.truckOwnerMeta.totalTrips
              : 0;
          const disputePenalty = owner?.truckOwnerMeta?.visibilityPenaltyScore ?? 0;
          const rankingScore = Number((distanceKm * 10 - rating * 3 - completionRate * 2 + disputePenalty).toFixed(2));

          return {
            vehicleId: vehicle.id,
            ownerId: vehicle.ownerId,
            vehicleClassSnapshot: vehicle.vehicleClassSnapshot,
            licensePlate: vehicle.licensePlate,
            distanceKm: Number(distanceKm.toFixed(2)),
            rating,
            rankingScore
          };
        })
      );

      return {
        radiusKmUsed: radiusKm,
        expanded: index > 0,
        results: ranked.sort((left, right) => left.rankingScore - right.rankingScore)
      };
    }

    return {
      radiusKmUsed: searchRadiiKm.at(-1),
      expanded: searchRadiiKm.length > 1,
      results: []
    };
  }
}

import { ADDIS_LOCATIONS, AddisLocation } from '../data/addis-locations';
import { VEHICLE_TIERS, VehicleTier } from '../data/vehicle-classes';

export interface RouteQuote {
  pickup: AddisLocation;
  destination: AddisLocation;
  tier: VehicleTier;
  distanceKm: number;
  etaMinutes: number;
  estimatedFare: number;
  baseFare: number;
  distanceFare: number;
}

export interface DriverEarningsEstimate {
  tier: VehicleTier;
  tripsPerWeek: number;
  estimatedWeeklyGross: number;
  estimatedMonthlyGross: number;
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes estimated route distance and pricing quote based on Addis Ababa road factors.
 */
export function calculateQuote(
  pickupId: string,
  destinationId: string,
  tierSlug: string
): RouteQuote {
  const pickup = ADDIS_LOCATIONS.find((l) => l.id === pickupId) || ADDIS_LOCATIONS[0];
  const destination = ADDIS_LOCATIONS.find((l) => l.id === destinationId) || ADDIS_LOCATIONS[1];
  const tier = VEHICLE_TIERS.find((t) => t.slug === tierSlug) || VEHICLE_TIERS[1];

  let rawDistance = haversineDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
  
  // If origin and destination are the same location, assume local intra-zone move of 3.5 km
  if (rawDistance < 0.5) {
    rawDistance = 3.5;
  }

  // Addis Ababa urban detour factor (winding terrain, ring roads): 1.35x
  const distanceKm = Math.round(rawDistance * 1.35 * 10) / 10;

  // Estimated transit time: ~22 km/h average truck speed through city traffic + 12 min dispatch/loading buffer
  const etaMinutes = Math.round(distanceKm * 2.6 + 12);

  const distanceFare = Math.round(distanceKm * tier.perKmRate);
  const computedFare = tier.baseFare + distanceFare;
  const estimatedFare = Math.max(tier.minimumFare, computedFare);

  return {
    pickup,
    destination,
    tier,
    distanceKm,
    etaMinutes,
    estimatedFare,
    baseFare: tier.baseFare,
    distanceFare
  };
}

/**
 * Computes projected weekly and monthly driver earnings based on vehicle class and trip volume.
 */
export function calculateDriverEarnings(
  tierSlug: string,
  tripsPerWeek: number
): DriverEarningsEstimate {
  const tier = VEHICLE_TIERS.find((t) => t.slug === tierSlug) || VEHICLE_TIERS[1];
  
  // Average trip distance in Addis Ababa: ~12.5 km
  const averageTripFare = Math.round(tier.baseFare + 12.5 * tier.perKmRate);
  const estimatedWeeklyGross = averageTripFare * tripsPerWeek;
  const estimatedMonthlyGross = estimatedWeeklyGross * 4.2;

  return {
    tier,
    tripsPerWeek,
    estimatedWeeklyGross,
    estimatedMonthlyGross
  };
}

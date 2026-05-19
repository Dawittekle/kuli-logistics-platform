const earthRadiusKm = 6371;
const averageCitySpeedKmPerHour = 24;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const calculateHaversineDistanceKm = (originPoint, destinationPoint) => {
  const [originLng, originLat] = originPoint.coordinates;
  const [destinationLng, destinationLat] = destinationPoint.coordinates;
  const latDelta = toRadians(destinationLat - originLat);
  const lngDelta = toRadians(destinationLng - originLng);
  const originLatRad = toRadians(originLat);
  const destinationLatRad = toRadians(destinationLat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLatRad) * Math.cos(destinationLatRad) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

export class DeterministicMapsProvider {
  async getRoute(origin, destination) {
    const straightLineDistanceKm = calculateHaversineDistanceKm(origin, destination);
    const cityAdjustedDistanceKm = straightLineDistanceKm * 1.25;
    const etaMinutes = Math.max(1, Math.round((cityAdjustedDistanceKm / averageCitySpeedKmPerHour) * 60));

    return {
      distanceKm: Number(cityAdjustedDistanceKm.toFixed(2)),
      etaMinutes,
      provider: 'deterministic_local'
    };
  }
}

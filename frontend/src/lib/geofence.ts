/** Earth-radius haversine distance in meters. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const TABLE_GEOFENCE_RADIUS_M = 10;

export type GeoOrigin = { lat: number; lng: number };

export function geoOriginStorageKey(slug: string, tableNumber: number) {
  return `BonPainer-geo-origin:${slug}:${tableNumber}`;
}

export function readGeoOrigin(key: string): GeoOrigin | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoOrigin;
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeGeoOrigin(key: string, origin: GeoOrigin) {
  try {
    sessionStorage.setItem(key, JSON.stringify(origin));
  } catch {
    /* ignore */
  }
}

import type { Field } from "@/lib/types";

export type Coordinates = { lat: number; lng: number };
export type SortLocation = Coordinates & { source: "current" | "selected"; label?: string };

export function validCoordinates(point: Coordinates): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

export function fieldCoordinates(field: Field): Coordinates | null {
  const point = field.complex;
  return point && validCoordinates(point) && (point.lat !== 0 || point.lng !== 0)
    ? { lat: point.lat, lng: point.lng } : null;
}

export function distanceKm(origin: Coordinates, destination: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(destination.lat - origin.lat) / 2) ** 2
    + Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat))
    * Math.sin(radians(destination.lng - origin.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

export function compareFieldDistances(a: Field, b: Field, distances: ReadonlyMap<string, number | null>): number {
  const first = distances.get(a.id) ?? Infinity;
  const second = distances.get(b.id) ?? Infinity;
  return (first === second ? 0 : first - second) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/**
 * Build a Google Maps directions URL pointing at a field's location.
 *
 * Google Maps uses the user's current location as the origin when none is
 * given, so this effectively gives "directions from me to the field".
 *
 * Prefers the complex's coordinates; falls back to the field/complex address.
 * Coordinates of (0, 0) are treated as "unknown" because that's the value the
 * normalizer fills in when lat/lng are missing in the database.
 *
 * Returns `null` when there is no usable location.
 */
export function fieldDirectionsUrl(field?: Field | null): string | null {
  if (!field) {
    return null;
  }

  const lat = field.complex?.lat;
  const lng = field.complex?.lng;
  if (typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  const address = field.address?.trim() || field.complex?.address?.trim();
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }

  return null;
}

/**
 * Open Google Maps directions to the field in a new tab.
 * No-op when the field has no known location.
 */
export function openFieldDirections(field?: Field | null): void {
  const url = fieldDirectionsUrl(field);
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

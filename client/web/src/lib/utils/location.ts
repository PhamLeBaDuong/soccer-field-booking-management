import type { Field } from "@/lib/types";

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

import { find } from "geo-tz";

export function coordinatesTimeZone(location) {
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number"
        || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)
        || Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180
        || (location.lat === 0 && location.lng === 0)) return undefined;
    const zones = find(location.lat, location.lng);
    if (zones.length !== 1) throw new Error("Venue timezone is ambiguous at this map point. Choose a more precise location.");
    return zones[0];
}
export function venueTimeZone(venue) {
    return coordinatesTimeZone(venue) || venue?.metadata?.timeZone || undefined;
}
export function fieldTimeZone(field) {
    return venueTimeZone(field.complex) || coordinatesTimeZone(field) || field.metadata?.timeZone || undefined;
}
export function withVenueTimeZone(venue) {
    if (!venue) return venue;
    return { ...venue, metadata: { ...venue.metadata, timeZone: venueTimeZone(venue) } };
}
export function withFieldTimeZone(field) {
    if (!field) return field;
    return { ...field, complex: withVenueTimeZone(field.complex), metadata: { ...field.metadata, timeZone: fieldTimeZone(field) } };
}

export function withReservationTimeZone(resource) {
    if (!resource) return resource;
    return { ...resource,
        ...(resource.field && { field: withFieldTimeZone(resource.field) }),
        ...(resource.matchPost && { matchPost: withReservationTimeZone(resource.matchPost) }),
        ...(Array.isArray(resource.bookings) && { bookings: resource.bookings.map(withReservationTimeZone) }) };
}

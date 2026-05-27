import prisma from "../db.cjs";
import { haversineKm } from "./bookingService.js";

// ─── Shared include ───────────────────────────────────────────────────────────

/**
 * Standard field include: brings along the parent complex (for lat/lng + address),
 * and the owner's basic profile.
 */
const FIELD_INCLUDE = {
    complex: {
        select: { id: true, name: true, address: true, lat: true, lng: true },
    },
    owner: { select: { id: true, name: true, username: true } },
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns every field, each enriched with its parent complex info.
 * Optional filter: complexId, type, indoor, lights.
 */
export async function getAllFields({ complexId, type, indoor, lights } = {}) {
    const where = {
        ...(complexId !== undefined && { complexId }),
        ...(type      !== undefined && { type }),
        ...(indoor    !== undefined && { indoor:  indoor  === "true" || indoor  === true }),
        ...(lights    !== undefined && { lights:  lights  === "true" || lights  === true }),
    };
    return prisma.field.findMany({ where, include: FIELD_INCLUDE, orderBy: { name: "asc" } });
}

/**
 * Returns a single field by id.
 */
export async function getFieldById(fieldId) {
    if (!fieldId) throw new Error("fieldId is required");
    const field = await prisma.field.findUnique({ where: { id: fieldId }, include: FIELD_INCLUDE });
    if (!field) throw new Error("Field not found");
    return field;
}

/**
 * Returns fields within `radius` km of (lat, lng), sorted nearest-first.
 * Each result includes a `distanceKm` property.
 *
 * Only fields whose parent complex has coordinates are considered.
 * If `radius` is omitted it defaults to 50 km.
 */
export async function getNearbyFields(lat, lng, radius = 50) {
    const parsedLat    = parseFloat(lat);
    const parsedLng    = parseFloat(lng);
    const parsedRadius = parseFloat(radius);

    if (isNaN(parsedLat) || isNaN(parsedLng)) throw new Error("lat and lng must be valid numbers");
    if (isNaN(parsedRadius) || parsedRadius <= 0) throw new Error("radius must be a positive number");

    // Fetch all fields that have a complex with coordinates
    const fields = await prisma.field.findMany({
        where: {
            complex: {
                lat: { not: null },
                lng: { not: null },
            },
        },
        include: FIELD_INCLUDE,
    });

    const origin = { lat: parsedLat, lng: parsedLng };

    return fields
        .map(f => ({
            ...f,
            distanceKm: haversineKm(origin, { lat: f.complex.lat, lng: f.complex.lng }),
        }))
        .filter(f => f.distanceKm <= parsedRadius)
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

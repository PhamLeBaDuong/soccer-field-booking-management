import prisma from "../db.cjs";
import dotenv from "dotenv";
dotenv.config();

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * Returns true when no confirmed booking occupies the given slot on fieldId.
 * Pass excludeBookingIds to skip bookings that are part of the current operation.
 */
export async function isSlotFree(fieldId, startTime, endTime, excludeBookingIds = []) {
    const conflict = await prisma.booking.findFirst({
        where: {
            fieldId,
            status: "confirmed",
            id: { notIn: excludeBookingIds },
            AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime:   { gt: new Date(startTime) } },
            ],
        },
    });
    return conflict === null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Creates a single booking for one user/team.
 *
 * teamSize  – desired number of players PER SIDE in the final match.
 *             All bookings in the same match must share this value.
 * groupSize – how many players this booking actually brings (default 1).
 *             Must be ≥ 1 and ≤ teamSize.
 *             Multiple bookings on the same side are combined until their
 *             groupSizes sum to teamSize.
 *
 * needMatching – true  → enter matchmaking queue looking for an opponent side.
 *               Requires teamSizeFlexible = false (opponents must match exactly).
 *
 * Flexibility flags defer concrete values to match-confirmation time:
 *   timeFlexible     – accept whatever time slot is agreed at confirmation
 *   fieldFlexible    – accept the field resolved at confirmation
 *                      (pass lat/lng to enable proximity-based match priority)
 *   teamSizeFlexible – only valid for direct bookings (needMatching = false)
 *
 * lat / lng – user's location at booking time; used for proximity-based match
 *             priority when fieldFlexible = true and no fieldId is provided.
 */
export async function createBooking({
    userId,
    fieldId,
    startTime,
    endTime,
    teamSize,
    groupSize        = 1,
    fieldPrice,
    currency,
    needMatching     = false,
    timeFlexible     = false,
    fieldFlexible    = false,
    teamSizeFlexible = false,
    lat,
    lng,
}) {
    if (!userId)   throw new Error("userId is required");
    if (!teamSize) throw new Error("teamSize is required");
    if (!timeFlexible  && (!startTime || !endTime)) throw new Error("startTime and endTime are required unless timeFlexible is true");
    if (!fieldFlexible && !fieldId)                 throw new Error("fieldId is required unless fieldFlexible is true");

    const parsedTeamSize  = parseInt(teamSize,  10);
    const parsedGroupSize = parseInt(groupSize, 10);
    if (isNaN(parsedTeamSize)  || parsedTeamSize  < 1) throw new Error("teamSize must be a positive integer");
    if (isNaN(parsedGroupSize) || parsedGroupSize < 1) throw new Error("groupSize must be a positive integer");
    if (parsedGroupSize > parsedTeamSize) {
        throw new Error(`groupSize (${parsedGroupSize}) cannot exceed teamSize (${parsedTeamSize})`);
    }

    // Match-seeking bookings must declare a fixed teamSize — the opponent must match it exactly
    if (needMatching && teamSizeFlexible) {
        throw new Error("Bookings seeking a match cannot be teamSizeFlexible — declare a fixed teamSize so an opponent can be found");
    }

    // Block on confirmed conflicts immediately when the slot is fully specified
    if (fieldId && startTime && endTime) {
        const free = await isSlotFree(fieldId, startTime, endTime);
        if (!free) throw new Error("This time slot is already booked for the selected field");
    }

    const totalPrice = (fieldPrice && startTime && endTime)
        ? fieldPrice * ((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60))
        : 0;

    return prisma.booking.create({
        data: {
            userId,
            fieldId:          fieldId   || null,
            startTime:        startTime ? new Date(startTime) : null,
            endTime:          endTime   ? new Date(endTime)   : null,
            teamSize:         parsedTeamSize,
            groupSize:        parsedGroupSize,
            totalPrice,
            currency:         currency  || "VND",
            needMatching,
            timeFlexible,
            fieldFlexible,
            teamSizeFlexible,
            lat:              lat  ?? null,
            lng:              lng  ?? null,
            status:           "pending",
            createdAt:        new Date(),
        },
    });
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getBookingById(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new Error("Booking not found");
    return b;
}

export async function getFieldByBookingId(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const b = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { field: true },
    });
    if (!b) throw new Error("Booking not found");
    return b.field;
}

export async function getBookingsByUserId(userId) {
    if (!userId) throw new Error("userId is required");
    return prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

/**
 * Returns all confirmed bookings (occupied slots) for a field in a time window.
 * The frontend uses this to render calendar availability.
 */
export async function getOccupiedSlots(fieldId, startTime, endTime) {
    if (!fieldId || !startTime || !endTime) throw new Error("fieldId, startTime and endTime are required");
    return prisma.booking.findMany({
        where: {
            fieldId,
            status: "confirmed",
            AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime:   { gt: new Date(startTime) } },
            ],
        },
        orderBy: { startTime: "asc" },
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Directly confirms a booking (no match needed).
 * Flexible bookings must go through match confirmation instead.
 */
export async function confirmBooking(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b)                        throw new Error("Booking not found");
    if (b.status !== "pending")    throw new Error("Booking is not pending");
    if (b.timeFlexible || b.fieldFlexible) {
        throw new Error("Flexible bookings must be confirmed through a match");
    }
    if (b.fieldId && b.startTime && b.endTime) {
        const free = await isSlotFree(b.fieldId, b.startTime, b.endTime, [bookingId]);
        if (!free) throw new Error("This time slot is no longer available");
    }
    return prisma.booking.update({
        where: { id: bookingId },
        data:  { status: "confirmed", needMatching: false },
    });
}

export async function cancelBooking(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b)                      throw new Error("Booking not found");
    if (b.status === "canceled") throw new Error("Booking is already canceled");
    return prisma.booking.update({ where: { id: bookingId }, data: { status: "canceled" } });
}

export async function updateBooking(bookingId, updates) {
    if (!bookingId) throw new Error("bookingId is required");
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new Error("Booking not found");

    const checkFieldId = updates.fieldId   || b.fieldId;
    const checkStart   = updates.startTime || b.startTime;
    const checkEnd     = updates.endTime   || b.endTime;
    if (b.status === "confirmed" && checkFieldId && checkStart && checkEnd) {
        const free = await isSlotFree(checkFieldId, checkStart, checkEnd, [bookingId]);
        if (!free) throw new Error("The new time slot is already booked");
    }
    if (updates.startTime) updates.startTime = new Date(updates.startTime);
    if (updates.endTime)   updates.endTime   = new Date(updates.endTime);

    return prisma.booking.update({ where: { id: bookingId }, data: updates });
}

// ─── Match-finding ────────────────────────────────────────────────────────────

/**
 * Returns bookings compatible for matching with the given booking, sorted by
 * proximity (nearest field / user location first).
 * Used by clients to browse candidates before calling POST /api/matches/request.
 *
 * Compatibility rules (all must pass):
 *   - Both must have needMatching=true, status="pending", not yet in a match
 *   - teamSize must be exactly equal (no flexibility allowed for match-seeking bookings)
 *   - Time:  at least one side timeFlexible  OR  windows overlap
 *   - Field: at least one side fieldFlexible  OR  same fieldId
 */
export async function findMatchesForBooking(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const b = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: { field: { include: { complex: { select: { lat: true, lng: true } } } } },
    });
    if (!b)                     throw new Error("Booking not found");
    if (!b.needMatching)        throw new Error("This booking is not seeking a match");
    if (b.status !== "pending") throw new Error("Booking is not pending");
    if (b.matchSideId !== null) throw new Error("This booking is already in a match");

    const candidates = await prisma.booking.findMany({
        where: {
            id:           { not: bookingId },
            status:       "pending",
            needMatching: true,
            matchSideId:  null,
            teamSize:     b.teamSize,   // exact match required
        },
        include: {
            field: { include: { complex: { select: { lat: true, lng: true } } } },
            user:  { select: { id: true, name: true, username: true } },
        },
    });

    const filtered = candidates.filter(c => {
        const timeOk =
            b.timeFlexible || c.timeFlexible ||
            (b.startTime && b.endTime && c.startTime && c.endTime &&
             new Date(b.startTime) < new Date(c.endTime) &&
             new Date(b.endTime)   > new Date(c.startTime));

        const fieldOk =
            b.fieldFlexible || c.fieldFlexible ||
            (b.fieldId && b.fieldId === c.fieldId);

        return timeOk && fieldOk;
    });

    // Sort by proximity: exact field match first, then by Haversine distance
    const refLoc    = bookingLocation(b);
    const refFieldId = b.fieldId;
    return filtered.sort((cA, cB) =>
        distanceScore(refLoc, refFieldId, bookingLocation(cA), cA.fieldId) -
        distanceScore(refLoc, refFieldId, bookingLocation(cB), cB.fieldId)
    );
}

// ─── Location utilities (also used by matchService) ──────────────────────────

/**
 * Returns the best available {lat, lng} for a booking.
 * Field coordinates live on the parent Complex (Field has no lat/lng of its own).
 *
 *   1. booking.field.complex.lat/lng  – venue coordinates (most accurate)
 *   2. booking.lat / booking.lng      – user's stated location (fieldFlexible bookings)
 *   3. null                           – no location data available
 */
export function bookingLocation(booking) {
    const complexLat = booking.field?.complex?.lat;
    const complexLng = booking.field?.complex?.lng;
    if (complexLat != null && complexLng != null) {
        return { lat: complexLat, lng: complexLng };
    }
    if (booking.lat != null && booking.lng != null) {
        return { lat: booking.lat, lng: booking.lng };
    }
    return null;
}

/**
 * Haversine distance in km between two {lat, lng} points.
 */
export function haversineKm(loc1, loc2) {
    const R    = 6371;
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a    =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(loc1.lat * Math.PI / 180) *
        Math.cos(loc2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Lower score = better match.
 *   -1        – exact same fieldId (perfect venue match)
 *   distance  – Haversine km when locations are available
 *   Infinity  – no location data on either side
 */
function distanceScore(refLoc, refFieldId, candidateLoc, candidateFieldId) {
    if (refFieldId && refFieldId === candidateFieldId) return -1;
    if (refLoc && candidateLoc) return haversineKm(refLoc, candidateLoc);
    return Infinity;
}


import prisma from "../db.cjs";
import { isSlotFree, bookingLocation, haversineKm } from "./bookingService.js";
import dotenv from "dotenv";
dotenv.config();

// ─── Internal helpers ─────────────────────────────────────────────────────────

// Field has no lat/lng — coordinates live on the parent Complex.
// We include field→complex so bookingLocation() can reach complex.lat/lng.
const FIELD_WITH_LOCATION = {
    select: {
        id:      true,
        name:    true,
        address: true,
        complex: { select: { lat: true, lng: true } },
    },
};

const MATCH_INCLUDE = {
    sides: {
        orderBy: { sideNumber: "asc" },
        include: {
            bookings: {
                include: {
                    user:  { select: { id: true, name: true, username: true } },
                    field: FIELD_WITH_LOCATION,
                },
            },
        },
    },
};

async function getBookingOrThrow(id) {
    const b = await prisma.booking.findUnique({
        where:   { id },
        include: { field: FIELD_WITH_LOCATION },
    });
    if (!b) throw new Error(`Booking ${id} not found`);
    return b;
}

/**
 * Picks the first concrete (non-null) value from a list of bookings for each
 * resolved slot field.  Used so the Match row always stores the best known
 * field/time combination assembled from all participating bookings.
 */
function resolveSlot(bookings) {
    return {
        resolvedFieldId:   bookings.find(b => b.fieldId)?.fieldId       ?? null,
        resolvedStartTime: bookings.find(b => b.startTime)?.startTime   ?? null,
        resolvedEndTime:   bookings.find(b => b.endTime)?.endTime       ?? null,
    };
}

/**
 * Returns true if `incoming` can join `side1Bookings` on the same match side.
 *
 * Rules (all must pass):
 *   teamSize  – every booking must share the same target match team size
 *   groupSize – incoming.groupSize + sum(side1.groupSize) must be ≤ teamSize
 *               (the combined group must not overflow the side)
 *   Time      – incoming is timeFlexible, OR every side1 booking is timeFlexible,
 *               OR the incoming window overlaps each side1 booking's window
 *   Field     – incoming is fieldFlexible, OR every side1 booking is fieldFlexible,
 *               OR all share the same fieldId
 */
function canJoinSide(incoming, side1Bookings) {
    // Same target match size required across all bookings in a match
    if (!side1Bookings.every(b => b.teamSize === incoming.teamSize)) return false;

    // Combined group size must not overflow the side
    const side1Total = side1Bookings.reduce((sum, b) => sum + (b.groupSize ?? 1), 0);
    if ((incoming.groupSize ?? 1) + side1Total > incoming.teamSize) return false;

    // Time compatibility: incoming can match with all existing side1 bookings
    const timeOk = side1Bookings.every(b =>
        incoming.timeFlexible || b.timeFlexible ||
        (incoming.startTime && incoming.endTime && b.startTime && b.endTime &&
         new Date(incoming.startTime) < new Date(b.endTime) &&
         new Date(incoming.endTime)   > new Date(b.startTime))
    );
    if (!timeOk) return false;

    // Field compatibility
    const fieldOk = side1Bookings.every(b =>
        incoming.fieldFlexible || b.fieldFlexible ||
        (incoming.fieldId && incoming.fieldId === b.fieldId)
    );
    return fieldOk;
}

/**
 * Scores how well a pending match's location matches the incoming booking.
 * Lower score = higher priority.
 *
 *   -1        – at least one Side 1 booking shares the exact same fieldId
 *   distance  – Haversine km to the nearest Side 1 booking's location
 *   Infinity  – no location data on either side
 */
function locationScore(incomingBooking, side1Bookings) {
    // Exact field match — highest priority
    if (incomingBooking.fieldId) {
        if (side1Bookings.some(b => b.fieldId === incomingBooking.fieldId)) return -1;
    }

    const refLoc = bookingLocation(incomingBooking);
    if (!refLoc) return Infinity;

    let best = Infinity;
    for (const b of side1Bookings) {
        const loc = bookingLocation(b);
        if (loc) {
            const d = haversineKm(refLoc, loc);
            if (d < best) best = d;
        }
    }
    return best;
}

// ─── Request a match ──────────────────────────────────────────────────────────

/**
 * POST /api/matches/request  –  Body: { bookingId }
 *
 * Auto-matchmaking queue:
 *   1. Validate the booking (must be pending, needMatching=true, not in a match yet).
 *   2. Scan all existing "pending" Matches (Side 2 is still empty) for compatibility
 *      with the incoming booking.  A match is compatible when every booking already
 *      on Side 1 passes the areCompatible() check against the incoming booking.
 *   3. If a compatible pending match is found →
 *        • Connect this booking to its Side 2.
 *        • Advance match status to "ready" (both sides now filled).
 *        • Update the resolved field/time from the combined bookings.
 *   4. If no compatible match exists →
 *        • Create a new Match (status "pending") with Side 1 = [bookingId]
 *          and an empty Side 2, queuing this booking to wait for an opponent.
 *
 * Either way the updated/created Match record is returned.
 *
 * Note: after a match reaches "ready" the client calls POST /api/matches/:id/confirm
 *       (optionally supplying resolvedFieldId / resolvedStartTime / resolvedEndTime)
 *       to lock the slot and stamp every booking with the final field + time.
 */
export async function requestMatch(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");

    const booking = await getBookingOrThrow(bookingId);
    if (booking.status !== "pending") throw new Error("Booking is not pending");
    if (!booking.needMatching)        throw new Error("Booking is not seeking a match (needMatching is false)");
    if (booking.matchSideId !== null) throw new Error("Booking is already in a match");

    // ── Step 2: scan for compatible pending matches ──────────────────────────
    const pendingMatches = await prisma.match.findMany({
        where:   { status: "pending" },
        include: MATCH_INCLUDE,
    });

    // Filter to matches where Side 2 is empty and incoming booking can join Side 1
    const compatible = pendingMatches.filter(match => {
        const side1 = match.sides.find(s => s.sideNumber === 1);
        const side2 = match.sides.find(s => s.sideNumber === 2);
        if (!side2 || side2.bookings.length > 0)   return false;
        if (!side1 || side1.bookings.length === 0)  return false;
        return canJoinSide(booking, side1.bookings);
    });

    // ── Step 3: pick the best compatible match ───────────────────────────────
    if (compatible.length > 0) {
        // Primary sort: largest Side 1 total groupSize first
        //   → fill the most-complete pending side before starting a new one
        // Secondary sort: location score (exact field match → nearest → no data)
        compatible.sort((ma, mb) => {
            const side1a = ma.sides.find(s => s.sideNumber === 1);
            const side1b = mb.sides.find(s => s.sideNumber === 1);
            const totalA = side1a.bookings.reduce((s, b) => s + (b.groupSize ?? 1), 0);
            const totalB = side1b.bookings.reduce((s, b) => s + (b.groupSize ?? 1), 0);
            if (totalA !== totalB) return totalB - totalA;                     // larger first
            return locationScore(booking, side1a.bookings) -
                   locationScore(booking, side1b.bookings);
        });

        const best  = compatible[0];
        const side1 = best.sides.find(s => s.sideNumber === 1);
        const side2 = best.sides.find(s => s.sideNumber === 2);
        const resolvedSlot = resolveSlot([...side1.bookings, booking]);

        await prisma.$transaction([
            prisma.matchSide.update({
                where: { id: side2.id },
                data:  { bookings: { connect: { id: bookingId } } },
            }),
            prisma.match.update({
                where: { id: best.id },
                data:  { status: "ready", ...resolvedSlot },
            }),
        ]);

        return prisma.match.findUnique({ where: { id: best.id }, include: MATCH_INCLUDE });
    }

    // ── Step 4: no match found — queue as Side 1 ────────────────────────────
    return prisma.match.create({
        data: {
            status:            "pending",
            resolvedFieldId:   booking.fieldId    ?? null,
            resolvedStartTime: booking.startTime  ?? null,
            resolvedEndTime:   booking.endTime    ?? null,
            sides: {
                create: [
                    { sideNumber: 1, bookings: { connect: [{ id: bookingId }] } },
                    { sideNumber: 2 },   // empty — awaiting the opponent
                ],
            },
        },
        include: MATCH_INCLUDE,
    });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMatch(matchId) {
    if (!matchId) throw new Error("matchId is required");
    const match = await prisma.match.findUnique({ where: { id: matchId }, include: MATCH_INCLUDE });
    if (!match) throw new Error("Match not found");
    return match;
}

// ─── Confirm ─────────────────────────────────────────────────────────────────

/**
 * Confirms a match:
 *   1. Resolves the final field + time (from params or from the bookings on both sides).
 *   2. Checks for slot conflicts against confirmed bookings.
 *   3. In one transaction:
 *        • Confirms every booking on both sides, stamping each with the resolved
 *          fieldId + startTime + endTime so the result is fully concrete.
 *        • Marks the Match as "confirmed".
 *
 * Callers may pass resolvedFieldId / resolvedStartTime / resolvedEndTime to
 * override or supply values not yet present on the bookings (e.g. when both
 * sides had fieldFlexible = true and the admin picks the venue at confirm time).
 */
export async function confirmMatch(matchId, resolvedFieldId, resolvedStartTime, resolvedEndTime) {
    if (!matchId) throw new Error("matchId is required");

    const match = await prisma.match.findUnique({ where: { id: matchId }, include: MATCH_INCLUDE });
    if (!match)                      throw new Error("Match not found");
    if (match.status === "confirmed") throw new Error("Match is already confirmed");
    if (match.status === "canceled")  throw new Error("Match is canceled");
    if (match.status === "pending")   throw new Error("Match is still pending — waiting for an opponent before confirming");

    const fieldId   = resolvedFieldId   || match.resolvedFieldId;
    const startTime = resolvedStartTime || match.resolvedStartTime;
    const endTime   = resolvedEndTime   || match.resolvedEndTime;

    if (!fieldId || !startTime || !endTime) {
        throw new Error(
            "Cannot confirm: provide resolvedFieldId, resolvedStartTime and resolvedEndTime " +
            "(or ensure the bookings already carry concrete field/time values)"
        );
    }

    const allBookings   = match.sides.flatMap(s => s.bookings);
    const allBookingIds = allBookings.map(b => b.id);

    const free = await isSlotFree(fieldId, startTime, endTime, allBookingIds);
    if (!free) throw new Error("The resolved slot is already taken by another confirmed booking");

    await prisma.$transaction([
        // Stamp every booking on both sides with the final field + time
        ...allBookings.map(b =>
            prisma.booking.update({
                where: { id: b.id },
                data:  {
                    status:       "confirmed",
                    fieldId:      fieldId,
                    startTime:    new Date(startTime),
                    endTime:      new Date(endTime),
                    needMatching: false,
                },
            })
        ),
        prisma.match.update({
            where: { id: matchId },
            data:  {
                status:            "confirmed",
                resolvedFieldId:   fieldId,
                resolvedStartTime: new Date(startTime),
                resolvedEndTime:   new Date(endTime),
            },
        }),
    ]);

    return prisma.match.findUnique({ where: { id: matchId }, include: MATCH_INCLUDE });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Cancels a match.
 * All bookings are detached from their sides and reverted to "pending"
 * so they can re-enter the matchmaking queue.
 */
export async function cancelMatch(matchId) {
    if (!matchId) throw new Error("matchId is required");

    const match = await prisma.match.findUnique({ where: { id: matchId }, include: MATCH_INCLUDE });
    if (!match)                      throw new Error("Match not found");
    if (match.status === "canceled") throw new Error("Match is already canceled");

    const allBookings = match.sides.flatMap(s => s.bookings);

    await prisma.$transaction([
        ...allBookings.map(b =>
            prisma.booking.update({
                where: { id: b.id },
                data:  { status: "pending", matchSideId: null },
            })
        ),
        prisma.match.update({
            where: { id: matchId },
            data:  { status: "canceled" },
        }),
    ]);

    return { message: "Match canceled; all bookings returned to pending" };
}

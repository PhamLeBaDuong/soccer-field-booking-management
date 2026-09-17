import { withFieldReservation, validateReservationTime, assertReservationAvailable } from "./reservationService.js";
import prisma from "../db.cjs";
// import { isSlotFree } from "./bookingService.js"; // Legacy pre-transaction availability check.

// ─── Includes ─────────────────────────────────────────────────────────────────

const LOBBY_INCLUDE = {
    field: {
        include: {
            complex: { select: { id: true, name: true, address: true, lat: true, lng: true } },
        },
    },
    slots: {
        include: {
            user: { select: { id: true, name: true, username: true } },
        },
        orderBy: { joinedAt: "asc" },
    },
    creator: { select: { id: true, name: true, username: true } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when  initialSize + slots.count  >=  teamSize
 */
function isLobbyFull(lobby) {
    return (lobby.initialSize + lobby.slots.length) >= lobby.teamSize;
}

/**
 * Legacy flow below: confirmed a full lobby into a Match + Bookings.
 *
 * A lobby holds ALL players for a complete game (teamSize = total players,
 * e.g. 10 for a 5v5).  Once it reaches capacity it is a self-contained game,
 * so we immediately create the Match and a confirmed Booking for every
 * participant (creator + slot holders) — no partner lobby required.
 *
 * Returns the created Match, or null if the lobby could not be confirmed
 * (already matched, not actually full, slot in the past, or slot taken).
 */
// Legacy implementation retained for review; no longer executed.
// async function confirmFullLobby(lobby) {
//     // Re-fetch to get a fresh slot count and current status
//     const freshLobby = await prisma.lobby.findUnique({
//         where:   { id: lobby.id },
//         include: { slots: true },
//     });
//     if (!freshLobby)                       return null;
//     if (freshLobby.status === "matched")   return null; // already confirmed
//     if (!isLobbyFull(freshLobby))          return null;
//
//     // Past slots cannot be confirmed
//     if (new Date(freshLobby.startTime) < new Date()) {
//         await prisma.lobby.update({ where: { id: freshLobby.id }, data: { status: "canceled" } });
//         return null;
//     }
//
//     // The field/time slot must still be free of conflicting confirmed bookings
//     const free = await isSlotFree(freshLobby.fieldId, freshLobby.startTime, freshLobby.endTime);
//     if (!free) {
//         await prisma.lobby.update({ where: { id: freshLobby.id }, data: { status: "canceled" } });
//         return null;
//     }
//
//     const field = await prisma.field.findUnique({ where: { id: freshLobby.fieldId } });
//     const durationHours =
//         (new Date(freshLobby.endTime).getTime() - new Date(freshLobby.startTime).getTime()) / 3_600_000;
//     const totalPrice = (field?.pricePerHour ?? 0) * Math.max(0, durationHours);
//
//     // All participants: creator + slot holders (unique)
//     const userIds = [...new Set([freshLobby.creatorId, ...freshLobby.slots.map(s => s.userId)])];
//
//     return prisma.$transaction(async (tx) => {
//         const match = await tx.match.create({
//             data: {
//                 source:    "lobby",
//                 status:    "confirmed",
//                 fieldId:   freshLobby.fieldId,
//                 startTime: new Date(freshLobby.startTime),
//                 endTime:   new Date(freshLobby.endTime),
//                 bookings: {
//                     create: userIds.map(userId => ({
//                         userId,
//                         fieldId:   freshLobby.fieldId,
//                         startTime: new Date(freshLobby.startTime),
//                         endTime:   new Date(freshLobby.endTime),
//                         totalPrice,
//                         currency:  "VND",
//                         status:    "confirmed",
//                     })),
//                 },
//             },
//         });
//
//         await tx.lobby.update({
//             where: { id: freshLobby.id },
//             data:  { status: "matched", matchId: match.id },
//         });
//
//         return tx.match.findUnique({
//             where:   { id: match.id },
//             include: {
//                 lobbies:  { include: LOBBY_INCLUDE },
//                 bookings: { include: { user: { select: { id: true, name: true, username: true } } } },
//             },
//         });
//     });
// }
//

// Caller holds the field lock; confirmation and participant bookings commit together.
async function confirmFullLobby(tx, field, lobby) {
    if (["confirmed", "matched", "canceled"].includes(lobby.status) || !isLobbyFull(lobby)) {
        return { lobby };
    }
    let times;
    try {
        times = validateReservationTime(field, lobby.startTime, lobby.endTime);
        await assertReservationAvailable(tx, field.id, times.start, times.end);
    } catch (error) {
        // An expired/taken slot must never result in a confirmation notification.
        if (!/must be|Invalid booking|already booked/.test(error.message)) throw error;
        const canceled = await tx.lobby.update({ where: { id: lobby.id }, data: { status: "canceled" }, include: LOBBY_INCLUDE });
        return { lobby: canceled };
    }
    const userIds = [...new Set([lobby.creatorId, ...lobby.slots.map(slot => slot.userId)])];
    await tx.booking.createMany({
        data: userIds.map(userId => ({ userId, fieldId: field.id, lobbyId: lobby.id,
            matchId: null, startTime: times.start, endTime: times.end,
            totalPrice: times.totalPrice, currency: field.metadata?.currency ?? "VND",
            status: "confirmed", paymentStatus: "unpaid" })),
    });
    return { lobby: await tx.lobby.update({
        where: { id: lobby.id }, data: { status: "confirmed" }, include: LOBBY_INCLUDE,
    }) };
}
// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/lobbies
 *
 * Creates a new open lobby at a specific field + time slot.
 *
 * teamSize    – total players per side needed for a match (must be >= initialSize).
 * initialSize – how many players the creator already brings (default 1).
 *
 * If initialSize reaches capacity, participant bookings are confirmed immediately.
 */
// Legacy implementation retained for review; no longer executed.
// export async function createLobby({
//     fieldId,
//     startTime,
//     endTime,
//     teamSize,
//     initialSize = 1,
//     creatorId,
// }) {
//     if (!fieldId)   throw new Error("fieldId is required");
//     if (!startTime) throw new Error("startTime is required");
//     if (!endTime)   throw new Error("endTime is required");
//     if (!creatorId) throw new Error("creatorId is required");
//
//     const parsedTeamSize    = parseInt(teamSize,    10);
//     const parsedInitialSize = parseInt(initialSize, 10);
//
//     if (isNaN(parsedTeamSize)    || parsedTeamSize    < 1) throw new Error("teamSize must be a positive integer");
//     if (isNaN(parsedInitialSize) || parsedInitialSize < 1) throw new Error("initialSize must be a positive integer");
//     if (parsedInitialSize > parsedTeamSize)
//         throw new Error(`initialSize (${parsedInitialSize}) cannot exceed teamSize (${parsedTeamSize})`);
//
//     if (new Date(startTime) < new Date()) throw new Error("startTime must be in the future");
//     if (new Date(endTime) <= new Date(startTime)) throw new Error("endTime must be after startTime");
//
//     const field = await prisma.field.findUnique({ where: { id: fieldId } });
//     if (!field) throw new Error("Field not found");
//
//     // Check for an existing open/full lobby from this creator at the same slot
//     const duplicate = await prisma.lobby.findFirst({
//         where: {
//             creatorId,
//             fieldId,
//             startTime: new Date(startTime),
//             endTime:   new Date(endTime),
//             status:    { in: ["open", "full"] },
//         },
//     });
//     if (duplicate) throw new Error("You already have an active lobby at this field and time");
//
//     // Determine initial status
//     const startsAsFull = parsedInitialSize >= parsedTeamSize;
//     const lobby = await prisma.lobby.create({
//         data: {
//             fieldId,
//             startTime:   new Date(startTime),
//             endTime:     new Date(endTime),
//             teamSize:    parsedTeamSize,
//             initialSize: parsedInitialSize,
//             creatorId,
//             status: startsAsFull ? "full" : "open",
//             slots:  {},
//         },
//         include: LOBBY_INCLUDE,
//     });
//
//     // Confirm immediately if the lobby is already full from creation
//     if (startsAsFull) {
//         const match = await confirmFullLobby(lobby);
//         if (match) return { lobby: { ...lobby, status: "matched" }, match };
//     }
//
//     return { lobby, match: null };
// }

export async function createLobby({ fieldId, startTime, endTime, teamSize, initialSize = 1, creatorId }) {
    if (!creatorId) throw new Error("creatorId is required");
    const capacity = Number(teamSize), initial = Number(initialSize);
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("teamSize must be a positive integer");
    if (!Number.isInteger(initial) || initial < 1) throw new Error("initialSize must be a positive integer");
    if (initial > capacity) throw new Error("initialSize cannot exceed teamSize");
    return withFieldReservation(prisma, fieldId, async (tx, field) => {
        const { start, end } = validateReservationTime(field, startTime, endTime);
        await assertReservationAvailable(tx, fieldId, start, end);
        const duplicate = await tx.lobby.findFirst({ where: { creatorId, fieldId,
            startTime: start, endTime: end, status: { in: ["open", "full"] } } });
        if (duplicate) throw new Error("You already have an active lobby at this field and time");
        const lobby = await tx.lobby.create({ data: { fieldId, startTime: start, endTime: end,
            teamSize: capacity, initialSize: initial, creatorId, visibility: "public",
            status: initial === capacity ? "full" : "open" }, include: LOBBY_INCLUDE });
        return initial === capacity ? confirmFullLobby(tx, field, lobby) : { lobby };
    });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns all lobbies where the user is the creator OR has a LobbySlot.
 * Excludes canceled lobbies older than 24 h to keep the list clean.
 */
export async function getMyLobbies(userId) {
    if (!userId) throw new Error("userId is required");
    return prisma.lobby.findMany({
        where: {
            OR: [
                { creatorId: userId },
                { slots: { some: { userId } } },
            ],
            NOT: {
                AND: [
                    { status: "canceled" },
                    { endTime: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
                ],
            },
        },
        include: LOBBY_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
}

export async function getLobbyById(lobbyId) {
    if (!lobbyId) throw new Error("lobbyId is required");
    const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId }, include: LOBBY_INCLUDE });
    if (!lobby) throw new Error("Lobby not found");
    return lobby;
}

export async function listLobbies({ fieldId, status, teamSize } = {}) {
    const where = {};
    if (fieldId)  where.fieldId  = fieldId;
    if (status)   where.status   = status;
    if (teamSize) {
        const s = parseInt(teamSize, 10);
        if (!isNaN(s)) where.teamSize = s;
    }
    return prisma.lobby.findMany({
        where,
        include: LOBBY_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
}

// ─── Join ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/lobbies/:lobbyId/join
 * Adds the caller to the lobby.
 * If the lobby becomes full after joining, participant bookings are confirmed.
 */
// Legacy implementation retained for review; no longer executed.
// export async function joinLobby(lobbyId, userId) {
//     if (!lobbyId) throw new Error("lobbyId is required");
//     if (!userId)  throw new Error("userId is required");
//
//     const lobby = await prisma.lobby.findUnique({
//         where:   { id: lobbyId },
//         include: { slots: true },
//     });
//     if (!lobby) throw new Error("Lobby not found");
//     if (lobby.status === "matched")  throw new Error("This lobby has already been matched");
//     if (lobby.status === "canceled") throw new Error("This lobby has been canceled");
//     if (lobby.status === "full")     throw new Error("This lobby is already full");
//
//     // Prevent the creator from also joining as a slot (they're counted in initialSize)
//     if (lobby.creatorId === userId) throw new Error("You created this lobby — you are already counted in the initial size");
//
//     const alreadyIn = lobby.slots.some(s => s.userId === userId);
//     if (alreadyIn) throw new Error("You have already joined this lobby");
//
//     // Check that adding one more won't exceed teamSize
//     const spotsFilledAfter = lobby.initialSize + lobby.slots.length + 1;
//     if (spotsFilledAfter > lobby.teamSize) throw new Error("This lobby has no remaining slots");
//
//     // Create the slot
//     await prisma.lobbySlot.create({ data: { lobbyId, userId } });
//
//     // Check if the lobby is now full
//     const isFull = spotsFilledAfter >= lobby.teamSize;
//
//     let updatedLobby;
//     if (isFull) {
//         updatedLobby = await prisma.lobby.update({
//             where:   { id: lobbyId },
//             data:    { status: "full" },
//             include: LOBBY_INCLUDE,
//         });
//     } else {
//         updatedLobby = await prisma.lobby.findUnique({
//             where:   { id: lobbyId },
//             include: LOBBY_INCLUDE,
//         });
//     }
//
//     // Confirm into a match + bookings if the lobby is now full
//     const match = isFull ? await confirmFullLobby(updatedLobby) : null;
//
//     return { lobby: updatedLobby, match };
// }

export async function joinLobby(lobbyId, userId) {
    if (!lobbyId || !userId) throw new Error("lobbyId and userId are required");
    const reference = await prisma.lobby.findUnique({ where: { id: lobbyId } });
    if (!reference) throw new Error("Lobby not found");
    return withFieldReservation(prisma, reference.fieldId, async (tx, field) => {
        const lobby = await tx.lobby.findUnique({ where: { id: lobbyId }, include: LOBBY_INCLUDE });
        if (!lobby) throw new Error("Lobby not found");
        if (lobby.status !== "open") throw new Error("This lobby is already " + lobby.status);
        if (lobby.creatorId === userId) throw new Error("You created this lobby and are already a participant");
        if (lobby.slots.some(slot => slot.userId === userId)) throw new Error("You have already joined this lobby");
        if (isLobbyFull(lobby)) throw new Error("This lobby has no remaining slots");
        validateReservationTime(field, lobby.startTime, lobby.endTime);
        await tx.lobbySlot.create({ data: { lobbyId, userId } });
        const updated = await tx.lobby.findUnique({ where: { id: lobbyId }, include: LOBBY_INCLUDE });
        return isLobbyFull(updated) ? confirmFullLobby(tx, field, updated) : { lobby: updated };
    });
}

// ─── Leave ────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/lobbies/:lobbyId/leave
 * Removes the caller from the lobby.
 * Creator cannot leave (they must cancel the lobby).
 */
// Legacy implementation retained for review; no longer executed.
// export async function leaveLobby(lobbyId, userId) {
//     if (!lobbyId) throw new Error("lobbyId is required");
//     if (!userId)  throw new Error("userId is required");
//
//     const lobby = await prisma.lobby.findUnique({
//         where:   { id: lobbyId },
//         include: { slots: true },
//     });
//     if (!lobby)  throw new Error("Lobby not found");
//     if (lobby.creatorId === userId) throw new Error("The creator cannot leave — cancel the lobby instead");
//     if (!["open", "full"].includes(lobby.status)) {
//         throw new Error(`Cannot leave a lobby that is ${lobby.status}`);
//     }
//
//     const slot = lobby.slots.find(s => s.userId === userId);
//     if (!slot) throw new Error("You are not in this lobby");
//
//     await prisma.lobbySlot.delete({ where: { id: slot.id } });
//
//     // If the lobby was full, revert it to open
//     if (lobby.status === "full") {
//         await prisma.lobby.update({ where: { id: lobbyId }, data: { status: "open" } });
//     }
//
//     return prisma.lobby.findUnique({ where: { id: lobbyId }, include: LOBBY_INCLUDE });
// }

export async function leaveLobby(lobbyId, userId) {
    if (!lobbyId) throw new Error("lobbyId is required");
    const reference = await prisma.lobby.findUnique({ where: { id: lobbyId } });
    if (!reference) throw new Error("Lobby not found");
    return withFieldReservation(prisma, reference.fieldId, async (tx) => {
        if (!lobbyId) throw new Error("lobbyId is required");
        if (!userId)  throw new Error("userId is required");

        const lobby = await tx.lobby.findUnique({
            where:   { id: lobbyId },
            include: { slots: true },
    });
    if (!lobby)  throw new Error("Lobby not found");
    if (lobby.creatorId === userId) throw new Error("The creator cannot leave — cancel the lobby instead");
    if (!["open", "full"].includes(lobby.status)) {
        throw new Error(`Cannot leave a lobby that is ${lobby.status}`);
    }

    const slot = lobby.slots.find(s => s.userId === userId);
    if (!slot) throw new Error("You are not in this lobby");

    await tx.lobbySlot.delete({ where: { id: slot.id } });

    // If the lobby was full, revert it to open
    if (lobby.status === "full") {
        await tx.lobby.update({ where: { id: lobbyId }, data: { status: "open" } });
    }

    return tx.lobby.findUnique({ where: { id: lobbyId }, include: LOBBY_INCLUDE });

    });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/lobbies/:lobbyId
 * Only the lobby creator can cancel.
 */
// Legacy implementation retained for review; no longer executed.
// export async function cancelLobby(lobbyId, requesterId) {
//     if (!lobbyId)     throw new Error("lobbyId is required");
//     if (!requesterId) throw new Error("requesterId is required");
//
//     const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
//     if (!lobby) throw new Error("Lobby not found");
//     if (lobby.creatorId !== requesterId) throw new Error("Only the lobby creator can cancel this lobby");
//     if (lobby.status === "matched")  throw new Error("Cannot cancel a lobby that has already been matched");
//     if (lobby.status === "canceled") throw new Error("Lobby is already canceled");
//
//     return prisma.lobby.update({
//         where:   { id: lobbyId },
//         data:    { status: "canceled" },
//         include: LOBBY_INCLUDE,
//     });
// }

export async function cancelLobby(lobbyId, requesterId) {
    if (!lobbyId) throw new Error("lobbyId is required");
    const reference = await prisma.lobby.findUnique({ where: { id: lobbyId } });
    if (!reference) throw new Error("Lobby not found");
    return withFieldReservation(prisma, reference.fieldId, async (tx) => {
        if (!lobbyId)     throw new Error("lobbyId is required");
        if (!requesterId) throw new Error("requesterId is required");

        const lobby = await tx.lobby.findUnique({ where: { id: lobbyId } });
        if (!lobby) throw new Error("Lobby not found");
        if (lobby.creatorId !== requesterId) throw new Error("Only the lobby creator can cancel this lobby");
        if (["matched", "confirmed"].includes(lobby.status))  throw new Error("Cannot cancel a lobby that has already been matched");
        if (lobby.status === "canceled") throw new Error("Lobby is already canceled");

        return tx.lobby.update({
            where:   { id: lobbyId },
            data:    { status: "canceled" },
            include: LOBBY_INCLUDE,
    });

    });
}

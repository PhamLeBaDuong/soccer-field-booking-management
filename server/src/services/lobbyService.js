import { withFieldReservation, validateReservationTime, assertReservationAvailable } from "./reservationService.js";
import prisma from "../db.cjs";

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

// A full lobby confirms one booking per participant without creating a match.
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

export async function joinLobby(lobbyId, userId, db = prisma) {
    if (!lobbyId || !userId) throw new Error("lobbyId and userId are required");
    const reference = await db.lobby.findUnique({ where: { id: lobbyId } });
    if (!reference) throw new Error("Lobby not found");
    return withFieldReservation(db, reference.fieldId, async (tx, field) => {
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
 * The lobby creator or related field owner can cancel an open, unfilled lobby.
 */

export async function cancelLobby(lobbyId, requesterId) {
    if (!lobbyId) throw new Error("lobbyId is required");
    if (!requesterId) throw new Error("requesterId is required");
    const reference = await prisma.lobby.findUnique({ where: { id: lobbyId } });
    if (!reference) throw new Error("Lobby not found");
    return withFieldReservation(prisma, reference.fieldId, async (tx, field) => {
        const lobby = await tx.lobby.findUnique({ where: { id: lobbyId }, include: { slots: true } });
        if (!lobby) throw new Error("Lobby not found");
        if (lobby.creatorId !== requesterId && field.ownerId !== requesterId) {
            const error = new Error("Only the lobby creator or field owner can cancel this lobby");
            error.status = 403;
            throw error;
        }
        if (lobby.status === "canceled") throw new Error("Lobby is already canceled");
        if (lobby.status !== "open" || isLobbyFull(lobby)) {
            throw new Error("Cannot cancel a lobby that is already full or confirmed");
        }

        return tx.lobby.update({
            where:   { id: lobbyId },
            data:    { status: "canceled" },
            include: LOBBY_INCLUDE,
        });
    });
}

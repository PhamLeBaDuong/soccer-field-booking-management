import prisma from "../db.cjs";
import { isSlotFree } from "./bookingService.js";

// ─── Includes ─────────────────────────────────────────────────────────────────

const LOBBY_INCLUDE = {
    field: {
        include: {
            complex: { select: { lat: true, lng: true } },
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
 * Creates a Match + Bookings for two full lobbies.
 * Called inside a transaction or as a standalone operation (lobby auto-match).
 */
async function formLobbyMatch(lobby1, lobby2) {
    const field = await prisma.field.findUnique({ where: { id: lobby1.fieldId } });

    const durationHours =
        (new Date(lobby1.endTime).getTime() - new Date(lobby1.startTime).getTime()) / 3_600_000;
    const totalPrice = (field?.pricePerHour ?? 0) * Math.max(0, durationHours);
    const currency   = field?.currency ?? "VND";

    // Collect unique users from each lobby (creator + slot participants)
    function lobbyUsers(lobby) {
        const ids = new Set([lobby.creatorId, ...lobby.slots.map(s => s.userId)]);
        return [...ids];
    }

    const users1 = lobbyUsers(lobby1);
    const users2 = lobbyUsers(lobby2);
    const allUsers = [...new Set([...users1, ...users2])];

    return prisma.$transaction(async (tx) => {
        const match = await tx.match.create({
            data: {
                source:    "lobby",
                status:    "confirmed",
                fieldId:   lobby1.fieldId,
                startTime: new Date(lobby1.startTime),
                endTime:   new Date(lobby1.endTime),
                bookings: {
                    create: allUsers.map(userId => ({
                        userId,
                        fieldId:    lobby1.fieldId,
                        startTime:  new Date(lobby1.startTime),
                        endTime:    new Date(lobby1.endTime),
                        totalPrice,
                        currency,
                        status:     "confirmed",
                    })),
                },
            },
        });

        // Link both lobbies to the match and mark them "matched"
        await tx.lobby.update({
            where: { id: lobby1.id },
            data:  { status: "matched", matchId: match.id },
        });
        await tx.lobby.update({
            where: { id: lobby2.id },
            data:  { status: "matched", matchId: match.id },
        });

        return tx.match.findUnique({
            where:   { id: match.id },
            include: {
                lobbies:  LOBBY_INCLUDE,
                bookings: { include: { user: { select: { id: true, name: true, username: true } } } },
            },
        });
    });
}

/**
 * Tries to find another "full" lobby with the same field/time/teamSize
 * and, if found, forms a Match between the two.
 *
 * Returns the created Match or null if no partner was found.
 */
async function tryAutoMatch(lobby) {
    // Re-fetch to get fresh slot count
    const freshLobby = await prisma.lobby.findUnique({
        where:   { id: lobby.id },
        include: { slots: true },
    });
    if (!freshLobby || !isLobbyFull(freshLobby)) return null;
    if (freshLobby.status !== "full") return null;

    // Validate future slot
    if (new Date(freshLobby.startTime) < new Date()) {
        // Past slots cannot be matched; mark canceled
        await prisma.lobby.update({ where: { id: freshLobby.id }, data: { status: "canceled" } });
        return null;
    }

    // Find a partner lobby: same field, same teamSize, same time window, status "full"
    const partners = await prisma.lobby.findMany({
        where: {
            id:        { not: freshLobby.id },
            fieldId:   freshLobby.fieldId,
            teamSize:  freshLobby.teamSize,
            startTime: freshLobby.startTime,
            endTime:   freshLobby.endTime,
            status:    "full",
        },
        include: { slots: true },
        orderBy: { createdAt: "asc" }, // first-come-first-served
    });

    if (partners.length === 0) return null;

    const partner = partners[0];

    // Check the slot is still free
    const free = await isSlotFree(freshLobby.fieldId, freshLobby.startTime, freshLobby.endTime);
    if (!free) {
        // Slot was taken by something else; mark both canceled
        await prisma.lobby.updateMany({
            where: { id: { in: [freshLobby.id, partner.id] } },
            data:  { status: "canceled" },
        });
        return null;
    }

    // Re-include slots for booking creation
    const [lobbyWithSlots, partnerWithSlots] = await Promise.all([
        prisma.lobby.findUnique({ where: { id: freshLobby.id }, include: { slots: true } }),
        prisma.lobby.findUnique({ where: { id: partner.id    }, include: { slots: true } }),
    ]);

    return formLobbyMatch(lobbyWithSlots, partnerWithSlots);
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
 * If  initialSize >= teamSize  the lobby is immediately "full" and auto-match runs.
 */
export async function createLobby({
    fieldId,
    startTime,
    endTime,
    teamSize,
    initialSize = 1,
    creatorId,
}) {
    if (!fieldId)   throw new Error("fieldId is required");
    if (!startTime) throw new Error("startTime is required");
    if (!endTime)   throw new Error("endTime is required");
    if (!creatorId) throw new Error("creatorId is required");

    const parsedTeamSize    = parseInt(teamSize,    10);
    const parsedInitialSize = parseInt(initialSize, 10);

    if (isNaN(parsedTeamSize)    || parsedTeamSize    < 1) throw new Error("teamSize must be a positive integer");
    if (isNaN(parsedInitialSize) || parsedInitialSize < 1) throw new Error("initialSize must be a positive integer");
    if (parsedInitialSize > parsedTeamSize)
        throw new Error(`initialSize (${parsedInitialSize}) cannot exceed teamSize (${parsedTeamSize})`);

    if (new Date(startTime) < new Date()) throw new Error("startTime must be in the future");
    if (new Date(endTime) <= new Date(startTime)) throw new Error("endTime must be after startTime");

    const field = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!field) throw new Error("Field not found");

    // Check for an existing open/full lobby from this creator at the same slot
    const duplicate = await prisma.lobby.findFirst({
        where: {
            creatorId,
            fieldId,
            startTime: new Date(startTime),
            endTime:   new Date(endTime),
            status:    { in: ["open", "full"] },
        },
    });
    if (duplicate) throw new Error("You already have an active lobby at this field and time");

    // Determine initial status
    const startsAsFull = parsedInitialSize >= parsedTeamSize;
    const lobby = await prisma.lobby.create({
        data: {
            fieldId,
            startTime:   new Date(startTime),
            endTime:     new Date(endTime),
            teamSize:    parsedTeamSize,
            initialSize: parsedInitialSize,
            creatorId,
            status: startsAsFull ? "full" : "open",
            slots:  {},
        },
        include: LOBBY_INCLUDE,
    });

    // Auto-match immediately if the lobby is already full from creation
    if (startsAsFull) {
        const match = await tryAutoMatch(lobby);
        if (match) return { lobby: { ...lobby, status: "matched" }, match };
    }

    return { lobby, match: null };
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
 * If the lobby becomes full after joining, auto-match is triggered.
 */
export async function joinLobby(lobbyId, userId) {
    if (!lobbyId) throw new Error("lobbyId is required");
    if (!userId)  throw new Error("userId is required");

    const lobby = await prisma.lobby.findUnique({
        where:   { id: lobbyId },
        include: { slots: true },
    });
    if (!lobby) throw new Error("Lobby not found");
    if (lobby.status === "matched")  throw new Error("This lobby has already been matched");
    if (lobby.status === "canceled") throw new Error("This lobby has been canceled");
    if (lobby.status === "full")     throw new Error("This lobby is already full");

    // Prevent the creator from also joining as a slot (they're counted in initialSize)
    if (lobby.creatorId === userId) throw new Error("You created this lobby — you are already counted in the initial size");

    const alreadyIn = lobby.slots.some(s => s.userId === userId);
    if (alreadyIn) throw new Error("You have already joined this lobby");

    // Check that adding one more won't exceed teamSize
    const spotsFilledAfter = lobby.initialSize + lobby.slots.length + 1;
    if (spotsFilledAfter > lobby.teamSize) throw new Error("This lobby has no remaining slots");

    // Create the slot
    await prisma.lobbySlot.create({ data: { lobbyId, userId } });

    // Check if the lobby is now full
    const isFull = spotsFilledAfter >= lobby.teamSize;

    let updatedLobby;
    if (isFull) {
        updatedLobby = await prisma.lobby.update({
            where:   { id: lobbyId },
            data:    { status: "full" },
            include: LOBBY_INCLUDE,
        });
    } else {
        updatedLobby = await prisma.lobby.findUnique({
            where:   { id: lobbyId },
            include: LOBBY_INCLUDE,
        });
    }

    // Attempt auto-match if full
    const match = isFull ? await tryAutoMatch(updatedLobby) : null;

    return { lobby: updatedLobby, match };
}

// ─── Leave ────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/lobbies/:lobbyId/leave
 * Removes the caller from the lobby.
 * Creator cannot leave (they must cancel the lobby).
 */
export async function leaveLobby(lobbyId, userId) {
    if (!lobbyId) throw new Error("lobbyId is required");
    if (!userId)  throw new Error("userId is required");

    const lobby = await prisma.lobby.findUnique({
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

    await prisma.lobbySlot.delete({ where: { id: slot.id } });

    // If the lobby was full, revert it to open
    if (lobby.status === "full") {
        await prisma.lobby.update({ where: { id: lobbyId }, data: { status: "open" } });
    }

    return prisma.lobby.findUnique({ where: { id: lobbyId }, include: LOBBY_INCLUDE });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/lobbies/:lobbyId
 * Only the lobby creator can cancel.
 */
export async function cancelLobby(lobbyId, requesterId) {
    if (!lobbyId)     throw new Error("lobbyId is required");
    if (!requesterId) throw new Error("requesterId is required");

    const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
    if (!lobby) throw new Error("Lobby not found");
    if (lobby.creatorId !== requesterId) throw new Error("Only the lobby creator can cancel this lobby");
    if (lobby.status === "matched")  throw new Error("Cannot cancel a lobby that has already been matched");
    if (lobby.status === "canceled") throw new Error("Lobby is already canceled");

    return prisma.lobby.update({
        where:   { id: lobbyId },
        data:    { status: "canceled" },
        include: LOBBY_INCLUDE,
    });
}

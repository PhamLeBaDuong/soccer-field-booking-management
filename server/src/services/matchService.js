import prisma from "../db.cjs";

// ─── Includes ─────────────────────────────────────────────────────────────────

const MATCH_INCLUDE = {
    matchPost: {
        include: {
            team: {
                include: {
                    leader:  { select: { id: true, name: true, username: true } },
                    members: { include: { user: { select: { id: true, name: true, username: true } } } },
                },
            },
            field: true,
        },
    },
    lobbies: {
        include: {
            slots: { include: { user: { select: { id: true, name: true, username: true } } } },
        },
    },
    bookings: {
        include: {
            user:  { select: { id: true, name: true, username: true } },
            field: { include: { complex: { select: { lat: true, lng: true } } } },
        },
    },
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getMatch(matchId) {
    if (!matchId) throw new Error("matchId is required");
    const match = await prisma.match.findUnique({ where: { id: matchId }, include: MATCH_INCLUDE });
    if (!match) throw new Error("Match not found");
    return match;
}

export async function getMatchesByUser(userId) {
    if (!userId) throw new Error("userId is required");
    return prisma.match.findMany({
        where:   { bookings: { some: { userId } } },
        include: MATCH_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/matches/:matchId
 *
 * Cancels a confirmed match.
 * All associated bookings are also marked "canceled".
 * Lobbies linked to this match are reverted to "open" so players can re-queue.
 * (MatchPost-sourced matches: the post stays "matched"; teams must create a new post.)
 */
export async function cancelMatch(matchId) {
    if (!matchId) throw new Error("matchId is required");

    const match = await prisma.match.findUnique({
        where:   { id: matchId },
        include: { bookings: true, lobbies: true },
    });
    if (!match)                      throw new Error("Match not found");
    if (match.status === "canceled") throw new Error("Match is already canceled");

    await prisma.$transaction(async (tx) => {
        // Cancel all bookings
        await tx.booking.updateMany({
            where: { matchId },
            data:  { status: "canceled" },
        });

        // Revert matched lobbies back to open (clear their matchId too)
        if (match.lobbies.length > 0) {
            await tx.lobby.updateMany({
                where: { matchId },
                data:  { status: "open", matchId: null },
            });
        }

        // Cancel the match itself
        await tx.match.update({
            where: { id: matchId },
            data:  { status: "canceled" },
        });
    });

    return { message: "Match canceled; bookings voided and lobbies reopened" };
}

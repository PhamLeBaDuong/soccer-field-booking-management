import prisma from "../db.cjs";

/**
 * Cleanup service — run on a schedule to remove stale records once their time window passes.
 *
 * Rules:
 *   Lobbies  — if endTime < now and status is "open" or "full":
 *                → cancel the lobby (status = "canceled")
 *                → delete all its LobbySlots (no point keeping join records for a dead lobby)
 *
 *   MatchPosts — if preferredEndTime < now and status is "open":
 *                → cancel the post (status = "canceled")
 *
 *   Matches  — if endTime < now and status is "confirmed":
 *                → mark as "completed" (keep for history but flag as done)
 *                → bookings belonging to it are also marked "completed"
 */

export async function cleanupExpiredLobbies() {
    const now = new Date();

    // Find lobbies past their end time that are still "open" or "full"
    const expired = await prisma.lobby.findMany({
        where: {
            endTime: { lt: now },
            status:  { in: ["open", "full"] },
        },
        select: { id: true },
    });

    if (expired.length === 0) return { lobbiesCanceled: 0, slotDeleted: 0 };

    const ids = expired.map((l) => l.id);

    // Delete slots first (foreign key)
    const { count: slotDeleted } = await prisma.lobbySlot.deleteMany({
        where: { lobbyId: { in: ids } },
    });

    // Cancel the lobbies
    const { count: lobbiesCanceled } = await prisma.lobby.updateMany({
        where: { id: { in: ids } },
        data:  { status: "canceled" },
    });

    return { lobbiesCanceled, slotDeleted };
}

export async function cleanupExpiredMatchPosts() {
    const now = new Date();

    // Open posts whose preferred end time has passed
    const { count } = await prisma.matchPost.updateMany({
        where: {
            preferredEndTime: { lt: now },
            status:           "open",
        },
        data: { status: "canceled" },
    });

    return { matchPostsCanceled: count };
}

export async function cleanupCompletedMatches() {
    const now = new Date();

    // Confirmed matches whose slot has ended
    const matches = await prisma.match.findMany({
        where: {
            endTime: { lt: now },
            status:  "confirmed",
        },
        select: { id: true },
    });

    if (matches.length === 0) return { matchesCompleted: 0, bookingsCompleted: 0 };

    const ids = matches.map((m) => m.id);

    // Mark bookings as completed
    const { count: bookingsCompleted } = await prisma.booking.updateMany({
        where: { matchId: { in: ids }, status: "confirmed" },
        data:  { status: "completed" },
    });

    // Mark matches as completed
    const { count: matchesCompleted } = await prisma.match.updateMany({
        where: { id: { in: ids } },
        data:  { status: "completed" },
    });

    return { matchesCompleted, bookingsCompleted };
}

/**
 * Run all cleanup tasks and log a summary.
 */
export async function runCleanup() {
    try {
        const [lobbies, posts, matches] = await Promise.all([
            cleanupExpiredLobbies(),
            cleanupExpiredMatchPosts(),
            cleanupCompletedMatches(),
        ]);

        const total =
            lobbies.lobbiesCanceled +
            lobbies.slotDeleted +
            posts.matchPostsCanceled +
            matches.matchesCompleted +
            matches.bookingsCompleted;

        if (total > 0) {
            console.log(
                `[cleanup] lobbies canceled: ${lobbies.lobbiesCanceled}, ` +
                `slots removed: ${lobbies.slotDeleted}, ` +
                `posts canceled: ${posts.matchPostsCanceled}, ` +
                `matches completed: ${matches.matchesCompleted}, ` +
                `bookings completed: ${matches.bookingsCompleted}`
            );
        }
    } catch (err) {
        console.error("[cleanup] error:", err.message);
    }
}

import { withFieldReservation, validateReservationTime, assertReservationAvailable } from "./reservationService.js";
import { randomBytes } from "crypto";
import prisma from "../db.cjs";
import { isSlotFree } from "./bookingService.js";

// ─── Includes ─────────────────────────────────────────────────────────────────

const POST_INCLUDE = {
    team: {
        include: {
            leader:  { select: { id: true, name: true, username: true } },
            members: { include: { user: { select: { id: true, name: true, username: true } } } },
        },
    },
    field: { include: { complex: { select: { id: true, name: true, address: true, lat: true, lng: true } } } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode() {
    return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A3F9C2B1"
}

function teamPlayerIds(team) {
    return [...new Set(team.members.map(member => member.userId ?? member.user?.id).filter(Boolean))];
}

function assertTeamReady(team, role) {
    const count = teamPlayerIds(team).length;
    if (count < team.size) {
        throw Object.assign(new Error(`${role} team needs ${team.size} players (${count}/${team.size} joined)`), { status: 400 });
    }
}

/**
 * Validates that a given slot (field + start/end) is in the future.
 * Throws if the slot has already passed.
 */
function assertFutureSlot(startTime) {
    if (new Date(startTime) < new Date()) {
        throw new Error("The requested time slot is in the past — only future slots can be booked");
    }
}

async function assertTeamSlotAvailable(tx, teamId, start, end, excludePostId) {
    const pending = await tx.matchPost.findFirst({ where: {
        teamId, status: "open", id: { notIn: excludePostId ? [excludePostId] : [] },
        preferredStartTime: { lt: end }, preferredEndTime: { gt: start },
    } });
    if (pending) throw new Error("Team already has an overlapping match request");
    const team = await tx.team.findUnique({ where: { id: teamId }, include: { members: true } });
    const userIds = [...new Set([team.leaderId, ...team.members.map(member => member.userId)])];
    const confirmed = await tx.match.findFirst({ where: {
        status: "confirmed", startTime: { lt: end }, endTime: { gt: start },
        OR: [{ matchPost: { is: { teamId } } }, { bookings: { some: { userId: { in: userIds } } } }],
    } });
    if (confirmed) throw new Error("Team already has an overlapping confirmed match");
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/match-posts
 * Creates a new MatchPost for a team.
 *
 * visibility: "public" (default) | "private"
 * If private, a unique access code is auto-generated.
 *
 * preferredStartTime / preferredEndTime are required to prevent overlapping requests.
 * fieldId may be null for "any field".
 */
export async function createMatchPost({
    teamId,
    fieldId,
    preferredStartTime,
    preferredEndTime,
    visibility = "public",
    requesterId,
}) {
    if (!teamId)     throw new Error("teamId is required");
    if (!requesterId) throw new Error("requesterId is required");

    if (!preferredStartTime || !preferredEndTime) throw new Error("preferredStartTime and preferredEndTime are required");
    const start = new Date(preferredStartTime), end = new Date(preferredEndTime);
    if (!Number.isFinite(+start) || !Number.isFinite(+end)) throw new Error("Match request times must be valid dates");
    if (end <= start) throw new Error("Match request end time must be after start time");
    assertFutureSlot(start);
    return prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`;
        const team = await tx.team.findUnique({
            where:   { id: teamId },
            include: { members: { select: { userId: true } } },
        });
        if (!team) throw new Error("Team not found");
        if (team.leaderId !== requesterId) throw new Error("Only the team leader can post a match request");
        assertTeamReady(team, "Posting");

        // Validate field exists if provided
        if (fieldId) {
            const field = await tx.field.findUnique({ where: { id: fieldId } });
            if (!field) throw new Error("Field not found");
            validateReservationTime(field, start, end);
        }

        if (!["public", "private"].includes(visibility)) {
            throw new Error('visibility must be "public" or "private"');
        }

        // Adjacent slots and requests on other dates are allowed, across all fields.
        await assertTeamSlotAvailable(tx, teamId, start, end);

        const code = visibility === "private" ? generateCode() : null;

        const post = await tx.matchPost.create({
            data: {
                teamId,
                fieldId:            fieldId            || null,
                preferredStartTime: start,
                preferredEndTime: end,
                visibility,
                code,
                status: "open",
            },
            include: POST_INCLUDE,
        });

        return post;
    });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/match-posts/:postId
 * Returns the post.  For private posts the caller must supply the correct code.
 */
export async function getMatchPost(postId, code) {
    if (!postId) throw new Error("postId is required");

    const post = await prisma.matchPost.findUnique({ where: { id: postId }, include: POST_INCLUDE });
    if (!post) throw new Error("Match post not found");

    if (post.visibility === "private") {
        if (!code) throw new Error("This is a private match post — provide the access code");
        if (post.code !== code.toUpperCase()) throw new Error("Invalid access code");
    }

    return post;
}

/**
 * GET /api/match-posts
 * Lists open public match posts.
 * Optional filters: ?teamSize=&fieldId=&status=
 */
export async function listMatchPosts({ teamSize, fieldId, status = "open" } = {}) {
    const where = {
        visibility: "public",
        status,
    };

    if (fieldId)  where.fieldId  = fieldId;

    // Filter by team size via nested relation
    if (teamSize) {
        const s = parseInt(teamSize, 10);
        if (!isNaN(s)) where.team = { size: s };
    }

    return prisma.matchPost.findMany({
        where,
        include:  POST_INCLUDE,
        orderBy:  { createdAt: "desc" },
    });
}

/**
 * Returns all match posts for teams led by userId, plus posts the user accepted.
 */
export async function getMyMatchPosts(userId) {
    if (!userId) throw new Error("userId is required");
    return prisma.matchPost.findMany({
        where: {
            OR: [
                // Posts created by teams the user leads
                { team: { leaderId: userId } },
                // Posts accepted by a team the user leads (match was created → booking exists)
                {
                    match: {
                        bookings: { some: { userId } },
                    },
                },
            ],
        },
        include: POST_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
}

// ─── Accept ───────────────────────────────────────────────────────────────────

/**
 * POST /api/match-posts/:postId/accept
 *
 * Called by an opposing team's leader to accept a MatchPost.
 * Body: { acceptingTeamId, fieldId?, startTime?, endTime?, code? }
 *
 * Rules:
 *   • Post must be "open".
 *   • For private posts, the correct code must be provided.
 *   • Accepting team's size must equal the posting team's size.
 *   • A concrete field + time slot must be resolvable:
 *       - use post.fieldId / post.preferredStartTime / post.preferredEndTime if set,
 *         otherwise the caller must supply fieldId / startTime / endTime.
 *   • Resolved startTime must be >= now (cannot book past slots).
 *   • The slot must be free on the chosen field.
 *
 * On success:
 *   • Creates a Match record.
 *   • Creates one Booking per member of each team.
 *   • Marks the MatchPost as "matched".
 */
export async function acceptMatchPost(postId, {
    acceptingTeamId,
    fieldId: overrideFieldId,
    startTime: overrideStart,
    endTime: overrideEnd,
    code,
    requesterId,
}, db = prisma) {
    if (!postId)         throw new Error("postId is required");
    if (!acceptingTeamId) throw new Error("acceptingTeamId is required");
    if (!requesterId)    throw new Error("requesterId is required");

    // ── Fetch post ──────────────────────────────────────────────────────────
    const post = await db.matchPost.findUnique({
        where:   { id: postId },
        include: {
            team: { include: { members: { include: { user: { select: { id: true } } } } } },
            field: true,
        },
    });
    if (!post) throw new Error("Match post not found");
    if (post.status !== "open") throw new Error(`Match post is already ${post.status}`);

    // Private post gate
    if (post.visibility === "private") {
        if (!code) throw new Error("This is a private match post — provide the access code");
        if (post.code !== code.toUpperCase()) throw new Error("Invalid access code");
    }

    // ── Fetch accepting team ────────────────────────────────────────────────
    const acceptingTeam = await db.team.findUnique({
        where:   { id: acceptingTeamId },
        include: { members: { include: { user: { select: { id: true } } } } },
    });
    if (!acceptingTeam) throw new Error("Accepting team not found");
    if (acceptingTeam.leaderId !== requesterId) throw new Error("Only the accepting team's leader can accept a match post");
    if (acceptingTeam.id === post.teamId)       throw new Error("A team cannot accept its own match post");

    // ── Size check ──────────────────────────────────────────────────────────
    if (acceptingTeam.size !== post.team.size) {
        throw new Error(
            `Team size mismatch: post team has size ${post.team.size}, accepting team has size ${acceptingTeam.size}`
        );
    }

    // ── Resolve field + time ────────────────────────────────────────────────
    const resolvedFieldId = overrideFieldId || post.fieldId;
    const resolvedStart   = overrideStart   || post.preferredStartTime;
    const resolvedEnd     = overrideEnd     || post.preferredEndTime;

    if (!resolvedFieldId) throw new Error("No field specified — provide fieldId in the post or in the accept request");
    if (!resolvedStart)   throw new Error("No start time specified — provide preferredStartTime in the post or startTime in the accept request");
    if (!resolvedEnd)     throw new Error("No end time specified — provide preferredEndTime in the post or endTime in the accept request");

    assertFutureSlot(resolvedStart);

    const free = await isSlotFree(resolvedFieldId, resolvedStart, resolvedEnd);
    if (!free) throw new Error("The requested time slot is already booked on this field");

    // ── Fetch field for price ───────────────────────────────────────────────
    const field = await db.field.findUnique({ where: { id: resolvedFieldId } });
    if (!field) throw new Error("Field not found");

    // ── Create Match + Bookings in one transaction ──────────────────────────
    const match = await withFieldReservation(db, resolvedFieldId, async (tx, lockedField) => {
        const times = validateReservationTime(lockedField, resolvedStart, resolvedEnd);
        for (const teamId of [post.teamId, acceptingTeamId].sort()) {
            await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`;
        }
        // Recheck current rosters under the locks used by membership changes.
        const postingTeam = await tx.team.findUnique({ where: { id: post.teamId }, include: { members: true } });
        const currentAcceptingTeam = await tx.team.findUnique({ where: { id: acceptingTeamId }, include: { members: true } });
        if (!postingTeam || !currentAcceptingTeam) throw new Error("Team not found");
        if (currentAcceptingTeam.leaderId !== requesterId) throw new Error("Only the accepting team's leader can accept a match post");
        if (postingTeam.size !== currentAcceptingTeam.size) throw new Error("Team size mismatch");
        assertTeamReady(postingTeam, "Posting");
        assertTeamReady(currentAcceptingTeam, "Accepting");
        for (const teamId of [post.teamId, acceptingTeamId].sort()) {
            await assertTeamSlotAvailable(tx, teamId, times.start, times.end, postId);
        }
        const allUserIds = [...new Set([...teamPlayerIds(postingTeam), ...teamPlayerIds(currentAcceptingTeam)])];
        await assertReservationAvailable(tx, resolvedFieldId, times.start, times.end);
        const claimed = await tx.matchPost.updateMany({ where: { id: postId, status: "open" }, data: { status: "matched" } });
        if (claimed.count !== 1) throw new Error("Match post is already matched or canceled");
        const newMatch = await tx.match.create({
            data: {
                source:      "post",
                status:      "confirmed",
                fieldId:     resolvedFieldId,
                startTime:   new Date(resolvedStart),
                endTime:     new Date(resolvedEnd),
                matchPostId: postId,
                bookings: {
                    create: allUserIds.map(userId => ({
                        userId,
                        fieldId:    resolvedFieldId,
                        startTime:  new Date(resolvedStart),
                        endTime:    new Date(resolvedEnd),
                        totalPrice: times.totalPrice,
                        currency:   field.currency ?? "VND",
                        status:     "confirmed",
                    })),
                },
            },
            include: { bookings: true },
        });

        await tx.matchPost.update({
            where: { id: postId },
            data:  { status: "matched" },
        });

        return newMatch;
    });

    return db.match.findUnique({
        where:   { id: match.id },
        include: {
            matchPost: { include: POST_INCLUDE },
            bookings:  { include: { user: { select: { id: true, name: true, username: true } } } },
        },
    });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/match-posts/:postId
 * Only the posting team's leader can cancel.
 */
export async function cancelMatchPost(postId, requesterId) {
    if (!postId)      throw new Error("postId is required");
    if (!requesterId) throw new Error("requesterId is required");

    return prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "MatchPost" WHERE "id" = ${postId} FOR UPDATE`;
        const post = await tx.matchPost.findUnique({ where: { id: postId }, include: { team: true } });
        if (!post) throw new Error("Match post not found");
        if (post.team.leaderId !== requesterId) {
            throw Object.assign(new Error("Only the posting team's leader can cancel this match post"), { status: 403 });
        }
        if (post.status !== "open") throw new Error(`Match post is already ${post.status}`);
        // Acceptance and cancellation must claim the same open request atomically.
        const claimed = await tx.matchPost.updateMany({ where: { id: postId, status: "open" }, data: { status: "canceled" } });
        if (claimed.count !== 1) throw new Error("Match post is already matched or canceled");
        return tx.matchPost.findUnique({ where: { id: postId }, include: POST_INCLUDE });
    });
}

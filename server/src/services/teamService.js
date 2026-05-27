import prisma from "../db.cjs";

// ─── Includes ─────────────────────────────────────────────────────────────────

const TEAM_INCLUDE = {
    leader:  { select: { id: true, name: true, username: true } },
    members: {
        include: {
            user: { select: { id: true, name: true, username: true } },
        },
        orderBy: { joinedAt: "asc" },
    },
};

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/teams
 * Creates a new team and automatically adds the leader as a TeamMember.
 */
export async function createTeam({ name, size, leaderId }) {
    if (!name)     throw new Error("name is required");
    if (!leaderId) throw new Error("leaderId is required");

    const parsedSize = parseInt(size, 10);
    if (isNaN(parsedSize) || parsedSize < 1) throw new Error("size must be a positive integer");

    return prisma.team.create({
        data: {
            name,
            size: parsedSize,
            leaderId,
            members: {
                create: { userId: leaderId },
            },
        },
        include: TEAM_INCLUDE,
    });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getTeamById(teamId) {
    if (!teamId) throw new Error("teamId is required");
    const team = await prisma.team.findUnique({ where: { id: teamId }, include: TEAM_INCLUDE });
    if (!team) throw new Error("Team not found");
    return team;
}

export async function getTeamsByUser(userId) {
    if (!userId) throw new Error("userId is required");
    return prisma.team.findMany({
        where: { members: { some: { userId } } },
        include: TEAM_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
}

// ─── Members ──────────────────────────────────────────────────────────────────

/**
 * POST /api/teams/:teamId/members
 * Adds a user to the team.  Only the team leader can call this.
 */
export async function addMember(teamId, userId, requesterId) {
    if (!teamId || !userId) throw new Error("teamId and userId are required");

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== requesterId) throw new Error("Only the team leader can add members");

    // Count current members; must not exceed team.size
    const memberCount = await prisma.teamMember.count({ where: { teamId } });
    if (memberCount >= team.size) throw new Error("Team is already at full capacity");

    const existing = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw new Error("User is already a member of this team");

    return prisma.team.update({
        where: { id: teamId },
        data: { members: { create: { userId } } },
        include: TEAM_INCLUDE,
    });
}

/**
 * DELETE /api/teams/:teamId/members/:userId
 * Removes a member.  Leader can remove anyone; a player can remove themselves.
 * The leader cannot remove themselves (they must transfer or disband the team).
 */
export async function removeMember(teamId, targetUserId, requesterId) {
    if (!teamId || !targetUserId) throw new Error("teamId and userId are required");

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");

    const isLeader    = team.leaderId === requesterId;
    const isSelf      = requesterId === targetUserId;

    if (!isLeader && !isSelf) throw new Error("Not authorized to remove this member");
    if (targetUserId === team.leaderId) throw new Error("Cannot remove the team leader — disband the team instead");

    const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!membership) throw new Error("User is not a member of this team");

    await prisma.teamMember.delete({ where: { id: membership.id } });
    return prisma.team.findUnique({ where: { id: teamId }, include: TEAM_INCLUDE });
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * PUT /api/teams/:teamId
 * Updates team name or size.  Only the leader can update.
 */
export async function updateTeam(teamId, updates, requesterId) {
    if (!teamId) throw new Error("teamId is required");

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== requesterId) throw new Error("Only the team leader can update the team");

    const data = {};
    if (updates.name !== undefined) {
        if (!updates.name) throw new Error("name cannot be empty");
        data.name = updates.name;
    }
    if (updates.size !== undefined) {
        const s = parseInt(updates.size, 10);
        if (isNaN(s) || s < 1) throw new Error("size must be a positive integer");
        const memberCount = await prisma.teamMember.count({ where: { teamId } });
        if (s < memberCount) throw new Error(`Cannot shrink size below current member count (${memberCount})`);
        data.size = s;
    }

    return prisma.team.update({ where: { id: teamId }, data, include: TEAM_INCLUDE });
}

// ─── Disband ──────────────────────────────────────────────────────────────────

export async function disbandTeam(teamId, requesterId) {
    if (!teamId) throw new Error("teamId is required");
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== requesterId) throw new Error("Only the team leader can disband the team");

    // Cancel any open match posts first
    await prisma.matchPost.updateMany({
        where: { teamId, status: "open" },
        data:  { status: "canceled" },
    });

    // Cascade deletes TeamMember records (onDelete: Cascade on TeamMember.teamId)
    await prisma.team.delete({ where: { id: teamId } });
    return { message: "Team disbanded" };
}

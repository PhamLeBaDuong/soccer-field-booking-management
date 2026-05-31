import prisma from "../db.cjs";

function handleError(res, error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not found") || msg.includes("already") || msg.includes("forbidden")) {
        return res.status(msg.includes("forbidden") ? 403 : 400).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// POST /api/invites/team/:teamId/user/:inviteeId  — invite a user to a team
export async function sendInvite(req, res) {
    const { teamId, inviteeId } = req.params;
    if (inviteeId === req.user.id) return res.status(400).json({ error: "Cannot invite yourself" });
    try {
        const team = await prisma.team.findUnique({
            where:   { id: teamId },
            include: { members: { select: { userId: true } } },
        });
        if (!team) return res.status(404).json({ error: "Team not found" });

        const isMember = team.members.some((m) => m.userId === req.user.id) || team.leaderId === req.user.id;
        if (!isMember) return res.status(403).json({ error: "Forbidden: not a team member" });

        const alreadyMember = team.members.some((m) => m.userId === inviteeId) || team.leaderId === inviteeId;
        if (alreadyMember) return res.status(400).json({ error: "User is already on this team" });

        const invitee = await prisma.user.findUnique({ where: { id: inviteeId } });
        if (!invitee) return res.status(404).json({ error: "User not found" });

        const existing = await prisma.teamInvite.findFirst({
            where: { teamId, inviteeId, status: "pending" },
        });
        if (existing) return res.status(400).json({ error: "Invite already pending" });

        const invite = await prisma.teamInvite.create({
            data: { teamId, invitedById: req.user.id, inviteeId, status: "pending" },
            include: {
                team:      { select: { id: true, name: true, size: true } },
                invitedBy: { select: { id: true, name: true, username: true } },
                invitee:   { select: { id: true, name: true, username: true } },
            },
        });
        res.status(201).json({ message: "Invite sent", invite });
    } catch (error) { handleError(res, error); }
}

// GET /api/invites/mine  — pending invites received by current user
export async function getMyInvites(req, res) {
    try {
        const invites = await prisma.teamInvite.findMany({
            where:   { inviteeId: req.user.id, status: "pending" },
            include: {
                team:      { select: { id: true, name: true, size: true } },
                invitedBy: { select: { id: true, name: true, username: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(invites);
    } catch (error) { handleError(res, error); }
}

// POST /api/invites/:inviteId/accept
export async function acceptInvite(req, res) {
    try {
        const invite = await prisma.teamInvite.findUnique({ where: { id: req.params.inviteId } });
        if (!invite) return res.status(404).json({ error: "Invite not found" });
        if (invite.inviteeId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        if (invite.status !== "pending") return res.status(400).json({ error: "Invite is no longer pending" });

        await prisma.$transaction([
            prisma.teamInvite.update({
                where: { id: invite.id },
                data:  { status: "accepted" },
            }),
            prisma.teamMember.upsert({
                where:  { teamId_userId: { teamId: invite.teamId, userId: req.user.id } },
                create: { teamId: invite.teamId, userId: req.user.id },
                update: {},
            }),
        ]);
        res.json({ message: "Invite accepted — you joined the team" });
    } catch (error) { handleError(res, error); }
}

// POST /api/invites/:inviteId/decline
export async function declineInvite(req, res) {
    try {
        const invite = await prisma.teamInvite.findUnique({ where: { id: req.params.inviteId } });
        if (!invite) return res.status(404).json({ error: "Invite not found" });
        if (invite.inviteeId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        if (invite.status !== "pending") return res.status(400).json({ error: "Invite is no longer pending" });
        await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: "declined" } });
        res.json({ message: "Invite declined" });
    } catch (error) { handleError(res, error); }
}

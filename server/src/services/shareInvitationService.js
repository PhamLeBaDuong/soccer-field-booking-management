import { reservationTimeZone } from "./reservationService.js";
import { randomBytes, createHash } from "node:crypto";
import prisma from "../db.cjs";
import { joinLobby } from "./lobbyService.js";
import { acceptMatchPost } from "./matchPostService.js";

const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
const hashToken = token => {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) fail("Invitation not found", 404);
    return createHash("sha256").update(token).digest("hex");
};

export function createInvitationService(db = prisma, actions = { joinLobby, acceptMatchPost }) {
    async function target(client, kind, id) {
        if (kind === "team") {
            const team = await client.team.findUnique({ where: { id }, include: { members: true } });
            if (!team) fail("Team no longer exists", 404);
            return { ownerId: team.leaderId, title: team.name, size: team.size,
                count: team.members.length, status: "open", teamId: team.id, resource: team };
        }
        if (kind === "match") {
            const post = await client.matchPost.findUnique({ where: { id }, include: { team: { include: { members: true } }, field: true } });
            if (!post) fail("Match request no longer exists", 404);
            return { ownerId: post.team.leaderId, title: post.team.name, size: post.team.size,
                teamId: post.teamId, membersCount: new Set(post.team.members.map(member => member.userId)).size,
                status: post.status, fieldId: post.fieldId, fieldName: post.field?.name,
                startTime: post.preferredStartTime, endTime: post.preferredEndTime, timeZone: reservationTimeZone(post.field ?? {}), resource: post };
        }
        if (kind === "lobby") {
            const lobby = await client.lobby.findUnique({ where: { id }, include: { slots: true, field: true } });
            if (!lobby) fail("Lobby no longer exists", 404);
            return { ownerId: lobby.creatorId, title: lobby.field?.name ?? "Lobby", size: lobby.teamSize,
                count: lobby.initialSize + lobby.slots.length, status: lobby.status,
                startTime: lobby.startTime, endTime: lobby.endTime, timeZone: reservationTimeZone(lobby.field ?? {}), resource: lobby };
        }
        fail("Invalid invitation type", 400);
    }
    function availability(invite, detail) {
        if (!invite.teamKey) return "replaced";
        if (invite.status !== "pending") return invite.status;
        if (!invite.teamKey && invite.expiresAt && +new Date(invite.expiresAt) <= Date.now()) return "expired";
        if (detail.status !== "open") return detail.status;
        if (detail.count >= detail.size) return "full";
        if (detail.startTime && +new Date(detail.startTime) <= Date.now()) return "started";
        return "pending";
    }
    async function read(token, userId) {
        const invite = await db.shareInvitation.findUnique({ where: { tokenHash: hashToken(token) } });
        if (!invite) fail("Invitation not found", 404);
        const detail = await target(db, invite.kind, invite.targetId);
        const { resource, ...summary } = detail;
        let response = null, alreadyJoined = false;
        if (userId) {
            response = await db.shareInvitationResponse.findUnique({ where: { invitationId_userId: { invitationId: invite.id, userId } } });
            alreadyJoined = invite.kind === "team"
                ? resource.leaderId === userId || resource.members.some(m => m.userId === userId)
                : invite.kind === "lobby" && (resource.creatorId === userId || resource.slots.some(s => s.userId === userId));
            if (invite.kind !== "match" && invite.teamKey && response?.decision === "accepted" && !alreadyJoined) response = null;
        }
        return { id: invite.id, kind: invite.kind, targetId: invite.targetId, permanent: !!invite.teamKey, expiresAt: invite.expiresAt,
            status: availability(invite, detail), detail: summary,
            response: response ? { decision: response.decision, resultId: response.resultId } : null, alreadyJoined };
    }
    async function create(kind, targetId, userId) {
        if (typeof targetId !== "string" || !targetId) fail("Target is required", 400);
        const detail = await target(db, kind, targetId);
        if (detail.ownerId !== userId) fail("Only the owner can create invitation links", 403);
        return resourceLink(kind, targetId, userId);
    }
    async function teamLink(teamId, userId) {
        return resourceLink("team", teamId, userId);
    }
    async function resourceLink(kind, targetId, userId) {
        if (typeof targetId !== "string" || !targetId) fail("Target is required", 400);
        if (!userId) fail("Sign in to access the invitation link", 401);
        return db.$transaction(async tx => {
            if (kind === "team") await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${targetId} FOR UPDATE`;
            else if (kind === "lobby") await tx.$queryRaw`SELECT "id" FROM "Lobby" WHERE "id" = ${targetId} FOR UPDATE`;
            else if (kind === "match") await tx.$queryRaw`SELECT "id" FROM "MatchPost" WHERE "id" = ${targetId} FOR UPDATE`;
            const detail = await target(tx, kind, targetId);
            const isTeamMember = kind === "team" && detail.resource.members.some(member => member.userId === userId);
            if (detail.ownerId !== userId && !isTeamMember) {
                fail("Only the owner or team members can access this invitation link", 403);
            }
            // Keep existing team keys/URLs; use prefixes for other target types.
            const teamKey = kind === "team" ? targetId : `${kind}:${targetId}`;
            let invite = await tx.shareInvitation.findUnique({ where: { teamKey } });
            if (!invite) {
                const token = randomBytes(32).toString("hex");
                invite = await tx.shareInvitation.create({ data: { kind, targetId,
                    teamKey, token, tokenHash: hashToken(token), createdById: userId, expiresAt: null } });
            }
            return { id: invite.id, token: invite.token, expiresAt: null };
        });
    }
    async function list(kind, targetId, userId) {
        const detail = await target(db, kind, targetId);
        if (detail.ownerId !== userId) fail("Only the owner can manage invitation links", 403);
        return db.shareInvitation.findMany({ where: { kind, targetId },
            select: { id: true, status: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: "desc" } });
    }
    async function revoke(id, userId) {
        return db.$transaction(async tx => {
            await tx.$queryRaw`SELECT "id" FROM "ShareInvitation" WHERE "id" = ${id} FOR UPDATE`;
            const invite = await tx.shareInvitation.findUnique({ where: { id } });
            if (!invite) fail("Invitation not found", 404);
            const detail = await target(tx, invite.kind, invite.targetId);
            if (detail.ownerId !== userId) fail("Only the owner can revoke invitation links", 403);
            if (invite.teamKey) fail("The permanent invitation link cannot be revoked");
            if (invite.status === "accepted") fail("Invitation has already been accepted");
            return tx.shareInvitation.update({ where: { id }, data: { status: "revoked" }, select: { id: true, status: true } });
        });
    }
    async function respond(token, userId, decision, options = {}) {
        if (!userId) fail("Sign in to respond", 401);
        if (!["accepted", "declined"].includes(decision)) fail("Invalid invitation response", 400);
        const tokenHash = hashToken(token);
        return db.$transaction(async tx => {
            await tx.$queryRaw`SELECT "id" FROM "ShareInvitation" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
            const invite = await tx.shareInvitation.findUnique({ where: { tokenHash } });
            if (!invite) fail("Invitation not found", 404);
            const where = { invitationId_userId: { invitationId: invite.id, userId } };
            const previous = await tx.shareInvitationResponse.findUnique({ where });
            if (previous && !invite.teamKey) {
                if (previous.decision !== decision) fail("You have already responded to this invitation");
                return { decision, resultId: previous.resultId };
            }
            // Team capacity is serialized across different invitation links.
            if (invite.kind === "team") await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${invite.targetId} FOR UPDATE`;
            const detail = await target(tx, invite.kind, invite.targetId);
            if (invite.teamKey && previous) {
                if (previous.decision === "declined" && decision === "declined") return { decision, resultId: null };
                const alreadyJoined = invite.kind === "team" ? detail.resource.members.some(member => member.userId === userId)
                    : invite.kind === "lobby" ? detail.resource.slots.some(slot => slot.userId === userId)
                    : previous.decision === "accepted";
                if (alreadyJoined) {
                    if (decision === "accepted") return { decision, resultId: previous.resultId ?? invite.targetId };
                    fail("You have already accepted this invitation");
                }
            }
            const status = availability(invite, detail);
            if (status !== "pending") fail(`Invitation is ${status}`);
            if (detail.ownerId === userId) fail("You cannot respond to your own invitation");
            let resultId = null;
            if (decision === "accepted") {
                // Reuse reservation transactions within this invitation transaction.
                const transactionDb = new Proxy(tx, {
                    get: (client, key) => key === "$transaction" ? action => action(client) : client[key],
                });
                if (invite.kind === "team") {
                    if (detail.resource.members.some(m => m.userId === userId)) fail("You are already on this team");
                    await tx.teamMember.create({ data: { teamId: invite.targetId, userId } });
                    resultId = invite.targetId;
                } else if (invite.kind === "lobby") {
                    const result = await actions.joinLobby(invite.targetId, userId, transactionDb);
                    if (result.lobby.status === "canceled") fail("Lobby slot is no longer available");
                    resultId = invite.targetId;
                } else {
                    const result = await actions.acceptMatchPost(invite.targetId, {
                        acceptingTeamId: options.acceptingTeamId, requesterId: userId,
                        code: detail.resource.code,
                        fieldId: options.fieldId, startTime: options.startTime, endTime: options.endTime,
                    }, transactionDb);
                    resultId = result.id;
                }
            }
            // Declining never consumes the invitation for other recipients.
            const data = { invitationId: invite.id, userId, decision, resultId };
            if (invite.teamKey) await tx.shareInvitationResponse.upsert({ where, create: data, update: { decision, resultId } });
            else await tx.shareInvitationResponse.create({ data });
            return { decision, resultId };
        }, { maxWait: 10000, timeout: 20000 });
    }
    return { create, teamLink, resourceLink, read, list, revoke, respond };
}

export default createInvitationService();

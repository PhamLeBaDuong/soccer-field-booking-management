import service from "../services/shareInvitationService.js";
import { getIO } from "../socket.js";

const run = action => async (req, res) => {
    try { await action(req, res); }
    catch (error) {
        if (["P2021", "P2022"].includes(error.code)) {
            console.error("Invitation database migration is missing:", error.message);
            return res.status(503).json({ error: "Invitation links are temporarily unavailable. Please contact the site administrator." });
        }
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (/required|already|cannot|no remaining|private|invalid|mismatch|not found|only |no field|no start|no end|past|future|outside/i.test(error.message)) {
            return res.status(400).json({ error: error.message });
        }
        console.error(error);
        res.status(500).json({ error: "Unable to process invitation" });
    }
};
export const readLink = run(async (req, res) => res.json(await service.read(req.params.token)));
export const readMyLink = run(async (req, res) => res.json(await service.read(req.params.token, req.user.id)));
export const createLink = run(async (req, res) => res.status(201).json(await service.create(req.body.kind, req.body.targetId, req.user.id)));
export const getTeamLink = run(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await service.teamLink(req.params.teamId, req.user.id));
});
export const getResourceLink = run(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await service.resourceLink(req.params.kind, req.params.targetId, req.user.id));
});
export const listLinks = run(async (req, res) => res.json(await service.list(req.params.kind, req.params.targetId, req.user.id)));
export const revokeLink = run(async (req, res) => res.json(await service.revoke(req.params.id, req.user.id)));
export const respondLink = run(async (req, res) => {
    const result = await service.respond(req.params.token, req.user.id, req.body.decision, req.body);
    if (result.decision === "accepted") {
        const io = getIO();
        if (io) {
            // Notifications must not turn a committed acceptance into a failed response.
            try {
                const invite = await service.read(req.params.token, req.user.id);
                if (invite.kind === "lobby") io.emit("lobby:updated", { id: result.resultId, joinedCount: invite.detail.count, status: invite.detail.status });
                if (invite.kind === "match") {
                    io.emit("matchpost:updated", { id: invite.targetId, status: "matched" });
                    io.to(invite.detail.ownerId).emit("notify", { type: "match_accepted", matchId: result.resultId });
                }
            } catch (error) { console.error("Invitation notification failed", error); }
        }
    }
    res.json(result);
});

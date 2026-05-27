import * as teamService from "../services/teamService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "not found", "already", "only the team leader",
        "full capacity", "cannot remove the team leader", "cannot shrink",
        "not authorized", "must be a positive integer", "cannot be empty",
    ];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// POST /api/teams
export async function createTeam(req, res) {
    try {
        const { name, size } = req.body;
        const team = await teamService.createTeam({ name, size, leaderId: req.user.id });
        res.status(201).json(team);
    } catch (error) { handleError(res, error); }
}

// GET /api/teams/mine
export async function getMyTeams(req, res) {
    try {
        res.json(await teamService.getTeamsByUser(req.user.id));
    } catch (error) { handleError(res, error); }
}

// GET /api/teams/:teamId
export async function getTeamById(req, res) {
    try {
        res.json(await teamService.getTeamById(req.params.teamId));
    } catch (error) { handleError(res, error); }
}

// PUT /api/teams/:teamId
export async function updateTeam(req, res) {
    try {
        const team = await teamService.updateTeam(req.params.teamId, req.body, req.user.id);
        res.json(team);
    } catch (error) { handleError(res, error); }
}

// DELETE /api/teams/:teamId
export async function disbandTeam(req, res) {
    try {
        res.json(await teamService.disbandTeam(req.params.teamId, req.user.id));
    } catch (error) { handleError(res, error); }
}

// POST /api/teams/:teamId/members
export async function addMember(req, res) {
    try {
        const { userId } = req.body;
        const team = await teamService.addMember(req.params.teamId, userId, req.user.id);
        res.status(201).json(team);
    } catch (error) { handleError(res, error); }
}

// DELETE /api/teams/:teamId/members/:userId
export async function removeMember(req, res) {
    try {
        const team = await teamService.removeMember(
            req.params.teamId,
            req.params.userId,
            req.user.id,
        );
        res.json(team);
    } catch (error) { handleError(res, error); }
}

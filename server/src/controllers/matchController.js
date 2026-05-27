import * as matchService from "../services/matchService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "not found", "already canceled",
    ];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// GET /api/matches/mine
export async function getMyMatches(req, res) {
    try {
        res.json(await matchService.getMatchesByUser(req.user.id));
    } catch (error) { handleError(res, error); }
}

// GET /api/matches/:matchId
export async function getMatch(req, res) {
    try {
        res.json(await matchService.getMatch(req.params.matchId));
    } catch (error) { handleError(res, error); }
}

// DELETE /api/matches/:matchId
export async function cancelMatch(req, res) {
    try {
        res.json(await matchService.cancelMatch(req.params.matchId));
    } catch (error) { handleError(res, error); }
}

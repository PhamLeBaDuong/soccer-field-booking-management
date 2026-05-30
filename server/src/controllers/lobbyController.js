import * as lobbyService from "../services/lobbyService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "not found", "already", "only the lobby creator",
        "cannot leave", "cannot cancel", "is in the past", "must be in the future",
        "must be after starttime", "no remaining slots", "cannot exceed",
        "must be a positive integer", "slot is already", "matched",
    ];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// POST /api/lobbies
export async function createLobby(req, res) {
    try {
        const { fieldId, startTime, endTime, teamSize, initialSize } = req.body;
        const result = await lobbyService.createLobby({
            fieldId,
            startTime,
            endTime,
            teamSize,
            initialSize,
            creatorId: req.user.id,
        });
        res.status(201).json(result);
    } catch (error) { handleError(res, error); }
}

// GET /api/lobbies/mine
export async function getMyLobbies(req, res) {
    try {
        res.json(await lobbyService.getMyLobbies(req.user.id));
    } catch (error) { handleError(res, error); }
}

// GET /api/lobbies
export async function listLobbies(req, res) {
    try {
        const { fieldId, status, teamSize } = req.query;
        res.json(await lobbyService.listLobbies({ fieldId, status, teamSize }));
    } catch (error) { handleError(res, error); }
}

// GET /api/lobbies/:lobbyId
export async function getLobbyById(req, res) {
    try {
        res.json(await lobbyService.getLobbyById(req.params.lobbyId));
    } catch (error) { handleError(res, error); }
}

// POST /api/lobbies/:lobbyId/join
export async function joinLobby(req, res) {
    try {
        const result = await lobbyService.joinLobby(req.params.lobbyId, req.user.id);
        res.status(201).json(result);
    } catch (error) { handleError(res, error); }
}

// DELETE /api/lobbies/:lobbyId/leave
export async function leaveLobby(req, res) {
    try {
        res.json(await lobbyService.leaveLobby(req.params.lobbyId, req.user.id));
    } catch (error) { handleError(res, error); }
}

// DELETE /api/lobbies/:lobbyId
export async function cancelLobby(req, res) {
    try {
        res.json(await lobbyService.cancelLobby(req.params.lobbyId, req.user.id));
    } catch (error) { handleError(res, error); }
}

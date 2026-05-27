import * as matchPostService from "../services/matchPostService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "not found", "already", "only the", "mismatch",
        "no field specified", "no start time", "no end time",
        "is in the past", "already booked", "private match post",
        "invalid access code", "cannot accept its own", "must be",
    ];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// POST /api/match-posts
export async function createMatchPost(req, res) {
    try {
        const { teamId, fieldId, lat, lng, preferredStartTime, preferredEndTime, visibility } = req.body;
        const post = await matchPostService.createMatchPost({
            teamId,
            fieldId,
            lat,
            lng,
            preferredStartTime,
            preferredEndTime,
            visibility,
            requesterId: req.user.id,
        });
        res.status(201).json(post);
    } catch (error) { handleError(res, error); }
}

// GET /api/match-posts           (public listing)
export async function listMatchPosts(req, res) {
    try {
        const { teamSize, fieldId, status } = req.query;
        res.json(await matchPostService.listMatchPosts({ teamSize, fieldId, status }));
    } catch (error) { handleError(res, error); }
}

// GET /api/match-posts/:postId   (private: ?code=XXX)
export async function getMatchPost(req, res) {
    try {
        const { code } = req.query;
        res.json(await matchPostService.getMatchPost(req.params.postId, code));
    } catch (error) { handleError(res, error); }
}

// POST /api/match-posts/:postId/accept
export async function acceptMatchPost(req, res) {
    try {
        const { acceptingTeamId, fieldId, startTime, endTime, code } = req.body;
        const match = await matchPostService.acceptMatchPost(req.params.postId, {
            acceptingTeamId,
            fieldId,
            startTime,
            endTime,
            code,
            requesterId: req.user.id,
        });
        res.status(201).json(match);
    } catch (error) { handleError(res, error); }
}

// DELETE /api/match-posts/:postId
export async function cancelMatchPost(req, res) {
    try {
        res.json(await matchPostService.cancelMatchPost(req.params.postId, req.user.id));
    } catch (error) { handleError(res, error); }
}

import * as matchService from "../services/matchService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "not found", "not pending", "already", "cannot confirm",
        "still pending", "is not seeking", "no longer available",
        "is not seeking", "cannot be teamsizeflexible", "cannot exceed",
        "slot is already taken",
    ];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

/**
 * POST /api/matches/request
 * Body: { bookingId }
 *
 * Auto-matchmaking:
 *   • Finds the first compatible pending match (Side 2 empty) and joins it → status "ready"
 *   • If none found, creates a new pending match with Side 1 = [bookingId] → status "pending"
 */
export async function requestMatch(req, res) {
    const { bookingId } = req.body;
    try {
        const match = await matchService.requestMatch(bookingId);
        res.status(201).json(match);
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * GET /api/matches/:matchId
 */
export async function getMatch(req, res) {
    try {
        const match = await matchService.getMatch(req.params.matchId);
        res.json(match);
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * POST /api/matches/:matchId/confirm
 * Body (optional if sides already carry concrete field/time):
 *   { resolvedFieldId, resolvedStartTime, resolvedEndTime }
 *
 * Confirms the match and stamps every booking on both sides with the
 * final fieldId + startTime + endTime.
 */
export async function confirmMatch(req, res) {
    const { resolvedFieldId, resolvedStartTime, resolvedEndTime } = req.body ?? {};
    try {
        const match = await matchService.confirmMatch(
            req.params.matchId,
            resolvedFieldId,
            resolvedStartTime,
            resolvedEndTime
        );
        res.json(match);
    } catch (error) {
        handleError(res, error);
    }
}

/**
 * DELETE /api/matches/:matchId
 * Cancels the match and returns all bookings to pending.
 */
export async function cancelMatch(req, res) {
    try {
        const result = await matchService.cancelMatch(req.params.matchId);
        res.json(result);
    } catch (error) {
        handleError(res, error);
    }
}

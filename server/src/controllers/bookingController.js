import * as bookingService from "../services/bookingService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "already booked", "not found", "not pending",
        "already canceled", "already confirmed", "flexible bookings must",
        "not seeking", "already in a match", "no longer available",
        "new time slot", "cannot be teamsizeflexible", "cannot exceed",
        "must be a positive integer", "must be false",
    ];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createBooking(req, res) {
    try {
        const booking = await bookingService.createBooking(req.body);
        res.status(201).json(booking);
    } catch (error) { handleError(res, error); }
}

export async function getBookingById(req, res) {
    try {
        res.json(await bookingService.getBookingById(req.params.bookingId));
    } catch (error) { handleError(res, error); }
}

export async function getFieldByBookingId(req, res) {
    try {
        res.json(await bookingService.getFieldByBookingId(req.params.bookingId));
    } catch (error) { handleError(res, error); }
}

export async function getBookingsByUserId(req, res) {
    try {
        res.json(await bookingService.getBookingsByUserId(req.params.userId));
    } catch (error) { handleError(res, error); }
}

/**
 * GET /api/bookings/occupied?fieldId=X&startTime=Y&endTime=Z
 * Returns confirmed bookings (occupied slots) for the frontend calendar.
 */
export async function getOccupiedSlots(req, res) {
    const { fieldId, startTime, endTime } = req.query;
    try {
        res.json(await bookingService.getOccupiedSlots(fieldId, startTime, endTime));
    } catch (error) { handleError(res, error); }
}

export async function confirmBooking(req, res) {
    try {
        res.json(await bookingService.confirmBooking(req.params.bookingId));
    } catch (error) { handleError(res, error); }
}

export async function cancelBooking(req, res) {
    try {
        res.json(await bookingService.cancelBooking(req.params.bookingId));
    } catch (error) { handleError(res, error); }
}

export async function updateBooking(req, res) {
    try {
        res.json(await bookingService.updateBooking(req.params.bookingId, req.body));
    } catch (error) { handleError(res, error); }
}

// ─── Match-finding ────────────────────────────────────────────────────────────

/**
 * GET /api/bookings/:bookingId/matches
 * Returns all bookings compatible for matching with this one.
 * The user picks one and calls POST /api/matches/request to form the match.
 */
export async function findMatchesForBooking(req, res) {
    try {
        res.json(await bookingService.findMatchesForBooking(req.params.bookingId));
    } catch (error) { handleError(res, error); }
}

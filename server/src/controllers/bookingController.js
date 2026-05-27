import * as bookingService from "../services/bookingService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "not found",
    ];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// GET /api/bookings/occupied?fieldId=X&startTime=Y&endTime=Z
export async function getOccupiedSlots(req, res) {
    const { fieldId, startTime, endTime } = req.query;
    try {
        res.json(await bookingService.getOccupiedSlots(fieldId, startTime, endTime));
    } catch (error) { handleError(res, error); }
}

// GET /api/bookings/user/:userId
export async function getBookingsByUserId(req, res) {
    try {
        res.json(await bookingService.getBookingsByUserId(req.params.userId));
    } catch (error) { handleError(res, error); }
}

// GET /api/bookings/:bookingId
export async function getBookingById(req, res) {
    try {
        res.json(await bookingService.getBookingById(req.params.bookingId));
    } catch (error) { handleError(res, error); }
}

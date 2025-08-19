import * as bookingService from '../services/bookingService.js';



export async function createBooking(req, res) {
    const { userId, startTime, endTime, needMatching, teamSize, fieldPrice, currency, fieldId } = req.body;

    try {
        const booking = await bookingService.createBooking(userId, startDate, endDate, needMatching, teamSize, fieldPrice, currency, fieldId);
        res.status(201).json(booking);
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getBookingById(req, res) {
    const { bookingId } = req.params;

    try {
        const booking = await bookingService.getBookingById(bookingId);
        res.json(booking);
    } catch (error) {
        console.error("Error fetching booking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getFieldByBookingId(req, res) {
    const { bookingId } = req.params;

    try {
        const field = await bookingService.getFieldByBookingId(bookingId);
        res.json(field);
    } catch (error) {
        console.error("Error fetching field by booking ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function updateBooking(req, res) {
    const { bookingId } = req.params;
    const { startDate, endDate } = req.body;

    try {
        const updatedBooking = await bookingService.updateBooking(bookingId, { startDate, endDate });
        res.json(updatedBooking);
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function cancelBooking(req, res) {
    const { id } = req.params;

    try {
        const canceledBooking = await bookingService.cancelBooking(id);
        res.json(canceledBooking);
    } catch (error) {
        console.error("Error canceling booking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getBookingsByUserId(req, res) {
    const { userId } = req.params;

    try {
        const bookings = await bookingService.getBookingsByUserId(userId);
        res.json(bookings);
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAvailableBookings(req, res) {
    const { fieldId, startDate, endDate } = req.query;

    try {
        const availableBookings = await bookingService.getAvailableBookings(fieldId, startDate, endDate);
        res.json(availableBookings);
    } catch (error) {
        console.error("Error fetching available bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getMatchingBookings(req, res) {
    const { teamsize, startTime, endTime } = req.body;

    try {
        const matchedBookings = await bookingService.matchBooking(teamsize, startTime, endTime);
        res.json(matchedBookings);
    } catch (error) {
        console.error("Error matching bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getMachingBookingsByField(req, res) {
    const { fieldId, startTime, endTime, teamsize } = req.query;

    try {
        const matchingBookings = await bookingService.getMachingBookingsByField(teamsize, fieldId, startTime, endTime);
        res.json(matchingBookings);
    } catch (error) {
        console.error("Error fetching matching bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function matchBooking(req, res) {
    const { booking1Id, booking2Id, startTime, endTime, fieldId } = req.body;

    try {
        const result = await bookingService.matchBooking(booking1Id, booking2Id, startTime, endTime, fieldId);
        res.json(result);
    } catch (error) {
        console.error("Error matching bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function confirmBooking(req, res) {
    const { bookingId } = req.params;

    try {
        const confirmedBooking = await bookingService.confirmBooking(bookingId);
        res.json(confirmedBooking);
    } catch (error) {
        console.error("Error confirming booking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getUserBookings(req, res) {
    const { userId } = req.params;

    try {
        const bookings = await bookingService.getBookingsByUserId(userId);
        res.json(bookings);
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}



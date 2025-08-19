import prisma from "../db.cjs";
import dotenv from "dotenv";
dotenv.config();

export async function createBooking(userId, startTime, endTime, needMatching, teamSize, fieldPrice, currency, fieldId) {
    if( !userId || !startTime || !endTime || !fieldPrice || !teamSize || !fieldId) {
        throw new Error("Missing required fields");
    }

    const response = await prisma.booking.create({
        data: {
            userId,
            startTime,
            endTime,
            isMatchingRequired,
            totalPrice: fieldPrice * ((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)),
            currency,
            fieldId,
            teamSize,
            createdAt: new Date.now(),
            needMatching: needMatching || false,
            status: "pending",
        },
    });

    return response;
}

export async function getFieldByBookingId(bookingId) {
    if( !bookingId) {
        throw new Error("Missing required fields");
    }

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { field: true },
    });

    if (!booking) {
        throw new Error("Booking not found");
    }

    return booking.field;
}

export async function getAvailableBookings(fieldId, startTime, endTime) {
    if( !fieldId || !startTime || !endTime) {
        throw new Error("Missing required fields");
    }

    const bookings = await prisma.booking.findMany({
        where: {
            fieldId,
            needMatching: true,
            AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gt: new Date(startTime) } },
            ],
            status: "confirmed",
        },
    });
    return bookings;
}

export async function getMatchingBookings(teamSize, startTime, endTime) {
    if( !teamSize || !startTime || !endTime) {
        throw new Error("Missing required fields");
    }
    const bookings = await prisma.booking.findMany({
        where: {
            teamSize: { equals: teamSize },
            needMatching: true,
            AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gt: new Date(startTime) } },
            ],
            status: "pending",
        },
    });
    return bookings;
}

export async function getMachingBookingsByField(teamsize, fieldId, startTime, endTime) {
    if( !fieldId || !startTime || !endTime || !teamsize) {
        throw new Error("Missing required fields");
    }
    const bookings = await prisma.booking.findMany({
        where: {
            fieldId,
            teamsize: { equals: teamsize },
            needMatching: true,
            AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gt: new Date(startTime) } },
            ],
            status: "pending",
        },
    });
    return bookings;
}

export async function getBookingsByUserId(userId) {
    if( !userId) {
        throw new Error("Missing required fields");
    }
    const bookings = await prisma.booking.findMany({
        where: { userId },
    });
    return bookings;
}

export async function matchBooking(booking1Id, booking2Id, startTime, endTime, fieldId) {
    if( !booking1Id || !booking2Id) {
        throw new Error("Missing required fields");
    }
    const booking1 = await prisma.booking.findUnique({ where: { id: booking1Id } });
    const booking2 = await prisma.booking.findUnique({ where: { id: booking2Id } });

    if (!booking1 || !booking2) {
        throw new Error("Booking not found");
    }

    if (booking1.status !== "pending" || booking2.status !== "pending") {
        throw new Error("One or both bookings are not in a pending state");
    }

    const updatedBooking1 = await prisma.booking.update({
        where: { id: booking1Id },
        data: {
            status: "confirmed",
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            needMatching: false,
        },
    });
    const updatedBooking2 = await prisma.booking.update({
        where: { id: booking2Id },
        data: {
            status: "confirmed",
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            needMatching: false,
        },
    });

    if (!updatedBooking1 || !updatedBooking2) {
        throw new Error("Failed to update bookings");
    }

    const field = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!field) {
        throw new Error("Field not found");
    }

    // Update field's occupied times
    const updatedField = await prisma.field.update({
        where: { id: fieldId },
        data: {
            listOccupiedStartTime: {
                push: new Date(startTime),
            },
            listOccupiedEndTime: {
                push: new Date(endTime),
            },
        },
    });

    if (!updatedField) {
        throw new Error("Failed to update field");
    }

    return { updatedBooking1, updatedBooking2 };
}

export async function confirmBooking(bookingId, startTime, endTime) {
    if( !bookingId || !startTime || !endTime) {
        throw new Error("Missing required fields");
    }
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
        throw new Error("Booking not found");
    }

    if (booking.status !== "pending") {
        throw new Error("Booking is not in a pending state");
    }

    const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: "confirmed",
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            needMatching: false,
        },
    });

    return updatedBooking;
}

export async function cancelBooking(bookingId) {
    if( !bookingId) {
        throw new Error("Missing required fields");
    }
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
        throw new Error("Booking not found");
    }

    if (booking.status === "canceled") {
        throw new Error("Booking is already canceled");
    }
    const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: "canceled",
        },
    });

    return updatedBooking;
}

export async function getUserBookings(userId) {
    if( !userId) {
        throw new Error("Missing required fields");
    }
    const bookings = await prisma.booking.findMany({
        where: { userId },
    });

    return bookings;
}

export async function getBookingById(bookingId) {   
    if( !bookingId) {
        throw new Error("Missing required fields");
    }
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!booking) {
        throw new Error("Booking not found");
    }

    return booking;
}   

export async function updateBooking(bookingId, updates) {
    if( !bookingId || !updates) {
        throw new Error("Missing required fields");
    }
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
        throw new Error("Booking not found");
    }

    const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: updates,
    });

    return updatedBooking;
}








/**
 * Create booking
 * check if need matching
 * if yes, check the list to find a match
 * if no, process field start and end time
 * total price = field price * hours
 * 
 */
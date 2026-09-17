// All reservation writers lock the same field row before checking availability.
// Participant bookings are inserted together while this transaction holds the lock.
export async function withFieldReservation(db, fieldId, action) {
    if (typeof fieldId !== "string" || !fieldId) throw new Error("fieldId is required");
    return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Field" WHERE "id" = ${fieldId} FOR UPDATE`;
        const field = await tx.field.findUnique({ where: { id: fieldId } });
        if (!field) throw new Error("Field not found");
        return action(tx, field);
    }, { maxWait: 10000, timeout: 20000 });
}

export function validateReservationTime(field, startTime, endTime, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!startTime || !endTime || !Number.isFinite(+start) || !Number.isFinite(+end)) {
        throw new Error("Invalid booking dates");
    }
    if (start <= now) throw new Error("Booking startTime must be in the future");
    if (end <= start) throw new Error("Booking endTime must be after startTime");

    // Field operating times and reservation timestamps use their UTC clock values.
    const clockMinutes = value => {
        const date = new Date(value);
        return date.getUTCHours() * 60 + date.getUTCMinutes();
    };
    const open = clockMinutes(field.startTime);
    const close = clockMinutes(field.endTime);
    const windowMinutes = (close - open + 1440) % 1440 || 1440;
    const offset = (clockMinutes(start) - open + 1440) % 1440;
    const durationMinutes = (end - start) / 60000;
    if (offset + durationMinutes > windowMinutes) {
        throw new Error("Invalid booking time: outside field operating hours");
    }
    return { start, end, totalPrice: field.pricePerHour * durationMinutes / 60 };
}

export async function assertReservationAvailable(tx, fieldId, start, end) {
    const conflict = await tx.booking.findFirst({
        where: {
            fieldId, status: "confirmed",
            startTime: { lt: end }, endTime: { gt: start },
        },
    });
    if (conflict) throw new Error("The requested time slot is already booked on this field");
}

// Keep one schedule entry per reservation while retaining independent direct bookings.
export function groupReservations(bookings) {
    const seen = new Set();
    return bookings.filter(booking => {
        const key = booking.matchId ? `match:${booking.matchId}`
            : booking.lobbyId ? `lobby:${booking.lobbyId}` : `booking:${booking.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

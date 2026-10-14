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

export function reservationTimeZone(field) {
    const zone = field.metadata?.timeZone || "UTC";
    try { new Intl.DateTimeFormat("en", { timeZone: zone }); }
    catch { throw new Error("Invalid reservation timeZone"); }
    return zone;
}

export function validateReservationTime(field, startTime, endTime, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!startTime || !endTime || !Number.isFinite(+start) || !Number.isFinite(+end)) {
        throw new Error("Invalid booking dates");
    }
    if (start <= now) throw new Error("Booking startTime must be in the future");
    if (end <= start) throw new Error("Booking endTime must be after startTime");

    // Operating hours store clock labels; reservations store actual UTC instants.
    const timeZone = reservationTimeZone(field);
    const wallMinutes = value => {
        const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit",
            day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
        const get = type => Number(parts.find(part => part.type === type).value);
        return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) / 60000;
    };
    const clockMinutes = value => {
        const date = new Date(value);
        return date.getUTCHours() * 60 + date.getUTCMinutes();
    };
    const open = clockMinutes(field.startTime);
    const close = clockMinutes(field.endTime);
    const windowMinutes = (close - open + 1440) % 1440 || 1440;
    const offset = ((wallMinutes(start) - open) % 1440 + 1440) % 1440;
    const durationMinutes = (end - start) / 60000;
    if (offset + wallMinutes(end) - wallMinutes(start) > windowMinutes || wallMinutes(end) < wallMinutes(start)) {
        throw new Error("Invalid booking time: outside field operating hours");
    }
    return { start, end, timeZone, totalPrice: field.pricePerHour * durationMinutes / 60 };
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

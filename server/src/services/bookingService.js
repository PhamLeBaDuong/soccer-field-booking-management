import prisma from "../db.cjs";

// ─────────────────────────────────────────────────────────────────────────────
//  NOTE: Bookings are system-created only.
//  They are generated automatically when a Match is formed (via MatchPost accept
//  or Lobby auto-match).  Users cannot create bookings directly.
//
//  This service provides:
//    • isSlotFree      – used by matchPostService + lobbyService before creating a Match
//    • Read endpoints  – for the frontend to display a user's booking history
//    • getOccupiedSlots – calendar availability feed
//    • Haversine utilities – kept here for any service that needs location math
// ─────────────────────────────────────────────────────────────────────────────

// ─── Slot availability ────────────────────────────────────────────────────────

/**
 * Returns true when no confirmed booking occupies the given slot on fieldId.
 * Pass excludeBookingIds to skip bookings that are part of the current operation.
 */
export async function isSlotFree(fieldId, startTime, endTime, excludeBookingIds = []) {
    const conflict = await prisma.booking.findFirst({
        where: {
            fieldId,
            status: "confirmed",
            id:     { notIn: excludeBookingIds },
            AND: [
                { startTime: { lt: new Date(endTime)   } },
                { endTime:   { gt: new Date(startTime) } },
            ],
        },
    });
    return conflict === null;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export const BOOKING_INCLUDE = {
    field: { include: { complex: { select: { id: true, name: true, address: true, lat: true, lng: true } } } },
    match: {
        include: {
            matchPost: { include: { team: { select: { id: true, name: true, size: true } } } },
            lobbies:   { select: { id: true, teamSize: true, initialSize: true } },
        },
    },
    user: { select: { id: true, name: true, username: true } },
};

export async function getBookingById(bookingId) {
    if (!bookingId) throw new Error("bookingId is required");
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    if (!b) throw new Error("Booking not found");
    return b;
}

export async function getBookingsByUserId(userId) {
    if (!userId) throw new Error("userId is required");
    return prisma.booking.findMany({
        where:   { userId },
        include: BOOKING_INCLUDE,
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Returns confirmed bookings for a field in a time window.
 * Used by the frontend calendar to render occupied slots.
 */
export async function getOccupiedSlots(fieldId, startTime, endTime) {
    if (!fieldId || !startTime || !endTime) {
        throw new Error("fieldId, startTime and endTime are required");
    }
    return prisma.booking.findMany({
        where: {
            fieldId,
            status: "confirmed",
            AND: [
                { startTime: { lt: new Date(endTime)   } },
                { endTime:   { gt: new Date(startTime) } },
            ],
        },
        orderBy: { startTime: "asc" },
    });
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export const PAYMENT_OPTIONS = [
    { id: "cash",          label: "Tiền mặt (Cash)",                icon: "cash",     available: true  },
    { id: "bank_transfer", label: "Chuyển khoản ngân hàng",         icon: "bank",     available: true  },
    { id: "stripe",        label: "Credit / Debit Card (Stripe)",   icon: "stripe",   available: true  },
    { id: "paypal",        label: "PayPal",                         icon: "paypal",   available: true  },
    { id: "momo",          label: "Ví MoMo",                        icon: "momo",     available: true  },
    { id: "vnpay",         label: "VNPay",                          icon: "vnpay",    available: true  },
    { id: "zalopay",       label: "ZaloPay",                        icon: "zalopay",  available: true  },
];

// These methods have dedicated checkout endpoints — the generic /pay route rejects them
const REDIRECT_METHODS  = new Set(["stripe", "paypal", "momo", "vnpay", "zalopay"]);

export async function payBooking(bookingId, paymentMethod, userId) {
    if (!bookingId)     throw new Error("bookingId is required");
    if (!paymentMethod) throw new Error("paymentMethod is required");

    const validIds = PAYMENT_OPTIONS.map(o => o.id);
    if (!validIds.includes(paymentMethod)) throw new Error("Invalid paymentMethod");

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking)                    throw new Error("Booking not found");
    if (booking.userId !== userId)   throw new Error("Not authorized");
    if (booking.paymentStatus === "paid") throw new Error("Booking is already paid");

    const option = PAYMENT_OPTIONS.find(o => o.id === paymentMethod);
    if (!option.available) {
        return { redirectUrl: null, message: "Online payment coming soon" };
    }
    if (REDIRECT_METHODS.has(paymentMethod)) {
        return { redirectUrl: null, message: "Use the dedicated checkout endpoint for this method" };
    }

    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data:  { paymentMethod, paymentStatus: "paid" },
        include: BOOKING_INCLUDE,
    });
    return updated;
}

// ─── Location utilities ───────────────────────────────────────────────────────

/**
 * Returns the best available {lat, lng} for a booking/lobby/post.
 * Field coordinates live on the parent Complex (Field has no lat/lng of its own).
 */
export function bookingLocation(booking) {
    const complexLat = booking.field?.complex?.lat;
    const complexLng = booking.field?.complex?.lng;
    if (complexLat != null && complexLng != null) {
        return { lat: complexLat, lng: complexLng };
    }
    if (booking.lat != null && booking.lng != null) {
        return { lat: booking.lat, lng: booking.lng };
    }
    return null;
}

/**
 * Haversine distance in km between two {lat, lng} points.
 */
export function haversineKm(loc1, loc2) {
    const R    = 6371;
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a    =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(loc1.lat * Math.PI / 180) *
        Math.cos(loc2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

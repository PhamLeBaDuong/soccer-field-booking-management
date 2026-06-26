import prisma from "../db.cjs";
import { BOOKING_INCLUDE } from "./bookingService.js";

function getBaseUrl() {
    return process.env.PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
    const clientId     = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("PayPal credentials are not set");

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
        method:  "POST",
        headers: {
            Authorization:  `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    if (!res.ok) throw new Error("Failed to get PayPal access token");
    const data = await res.json();
    return data.access_token;
}

/**
 * Creates a PayPal Order for a booking.
 * Returns { orderId } — the frontend PayPal Buttons SDK uses this to show the approval dialog.
 * VND has no decimal places in PayPal (zero-decimal currency).
 */
export async function createOrder(bookingId, userId) {
    if (!bookingId) throw new Error("bookingId is required");

    const booking = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: { field: { select: { name: true } } },
    });
    if (!booking)                 throw new Error("Booking not found");
    if (booking.userId !== userId)   throw new Error("Not authorized");
    if (booking.paymentStatus === "paid") throw new Error("Booking is already paid");

    const accessToken = await getAccessToken();
    const currency    = (booking.currency ?? "VND").toUpperCase();
    // VND is zero-decimal in PayPal — no fractional units
    const value       = Math.round(booking.totalPrice).toString();

    const res = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
        method:  "POST",
        headers: {
            Authorization:  `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
                reference_id: bookingId,
                description:  booking.field?.name ?? "Soccer Field Booking",
                amount: { currency_code: currency, value },
            }],
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to create PayPal order");
    }

    const order = await res.json();
    return { orderId: order.id };
}

/**
 * Captures an approved PayPal Order and marks the booking as paid.
 */
export async function captureOrder(bookingId, orderId, userId) {
    if (!bookingId) throw new Error("bookingId is required");
    if (!orderId)   throw new Error("orderId is required");

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking)                 throw new Error("Booking not found");
    if (booking.userId !== userId)   throw new Error("Not authorized");
    if (booking.paymentStatus === "paid") {
        return prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    }

    const accessToken = await getAccessToken();
    const res = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
        method:  "POST",
        headers: {
            Authorization:  `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to capture PayPal payment");
    }

    const capture = await res.json();
    if (capture.status !== "COMPLETED") {
        throw new Error("PayPal payment was not completed");
    }

    return prisma.booking.update({
        where:   { id: bookingId },
        data:    { paymentMethod: "paypal", paymentStatus: "paid" },
        include: BOOKING_INCLUDE,
    });
}

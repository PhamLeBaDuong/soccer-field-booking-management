import Stripe from "stripe";
import prisma from "../db.cjs";
import { BOOKING_INCLUDE } from "./bookingService.js";

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

/**
 * Creates a Stripe Checkout Session for a booking.
 * VND is a zero-decimal currency in Stripe — pass the amount as-is (no × 100).
 */
export async function createCheckoutSession(bookingId, userId, clientUrl) {
    if (!bookingId) throw new Error("bookingId is required");

    const booking = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: { field: { select: { name: true } } },
    });
    if (!booking)               throw new Error("Booking not found");
    if (booking.userId !== userId) throw new Error("Not authorized");
    if (booking.paymentStatus === "paid") throw new Error("Booking is already paid");

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
        mode:           "payment",
        payment_method_types: ["card"],
        line_items: [{
            price_data: {
                currency:     (booking.currency ?? "VND").toLowerCase(),
                unit_amount:  Math.round(booking.totalPrice),   // VND = zero-decimal
                product_data: {
                    name:        booking.field?.name ?? "Soccer Field Booking",
                    description: `Booking ID: ${booking.id}`,
                },
            },
            quantity: 1,
        }],
        metadata: { bookingId: booking.id, userId },
        success_url: `${clientUrl}/bookings/${bookingId}?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${clientUrl}/bookings/${bookingId}?stripe_canceled=1`,
    });

    return { url: session.url, sessionId: session.id };
}

/**
 * Verifies a completed Stripe Checkout Session and marks the booking as paid.
 * Called by the frontend after Stripe redirects back to the success URL.
 */
export async function verifyCheckoutSession(sessionId, bookingId, userId) {
    if (!sessionId) throw new Error("sessionId is required");
    if (!bookingId) throw new Error("bookingId is required");

    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
        throw new Error("Payment not completed");
    }
    if (session.metadata?.bookingId !== bookingId) {
        throw new Error("Session does not match this booking");
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking)               throw new Error("Booking not found");
    if (booking.userId !== userId) throw new Error("Not authorized");

    if (booking.paymentStatus === "paid") {
        return prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    }

    return prisma.booking.update({
        where: { id: bookingId },
        data:  { paymentMethod: "stripe", paymentStatus: "paid" },
        include: BOOKING_INCLUDE,
    });
}

/**
 * Stripe webhook handler — marks booking paid on checkout.session.completed.
 * Requires the raw request body (not JSON-parsed) to verify the signature.
 */
export async function handleWebhook(rawBody, signature) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = getStripe();
    const event  = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
        const session   = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if (bookingId && session.payment_status === "paid") {
            await prisma.booking.update({
                where: { id: bookingId },
                data:  { paymentMethod: "stripe", paymentStatus: "paid" },
            });
        }
    }

    return { received: true };
}

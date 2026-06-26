import * as bookingService from "../services/bookingService.js";
import * as stripeService  from "../services/stripeService.js";
import * as paypalService  from "../services/paypalService.js";
import * as momoService    from "../services/momoService.js";
import * as vnpayService   from "../services/vnpayService.js";
import * as zalopayService from "../services/zalopayService.js";

function handleError(res, error) {
    const clientPhrases = [
        "required", "not found", "invalid", "not authorized", "already paid",
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

// GET /api/bookings/:bookingId/payment-options
export async function getPaymentOptions(req, res) {
    try {
        res.json(bookingService.PAYMENT_OPTIONS);
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/pay   body: { paymentMethod }
export async function payBooking(req, res) {
    const { bookingId } = req.params;
    const { paymentMethod } = req.body;
    const userId = req.user?.id;
    try {
        const result = await bookingService.payBooking(bookingId, paymentMethod, userId);
        res.json(result);
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/checkout/stripe
export async function createStripeCheckout(req, res) {
    const { bookingId } = req.params;
    const userId    = req.user?.id;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    try {
        const result = await stripeService.createCheckoutSession(bookingId, userId, clientUrl);
        res.json(result);
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/checkout/stripe/verify  body: { sessionId }
export async function verifyStripePayment(req, res) {
    const { bookingId } = req.params;
    const { sessionId } = req.body;
    const userId = req.user?.id;
    try {
        const booking = await stripeService.verifyCheckoutSession(sessionId, bookingId, userId);
        res.json(booking);
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/checkout/paypal
export async function createPaypalOrder(req, res) {
    const { bookingId } = req.params;
    const userId = req.user?.id;
    try {
        const result = await paypalService.createOrder(bookingId, userId);
        res.json(result);
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/checkout/paypal/capture  body: { orderId }
export async function capturePaypalPayment(req, res) {
    const { bookingId } = req.params;
    const { orderId }   = req.body;
    const userId = req.user?.id;
    try {
        const booking = await paypalService.captureOrder(bookingId, orderId, userId);
        res.json(booking);
    } catch (error) { handleError(res, error); }
}

// ── MoMo ─────────────────────────────────────────────────────────────────────

// POST /api/bookings/:bookingId/checkout/momo
export async function createMomoPayment(req, res) {
    const { bookingId } = req.params;
    const userId    = req.user?.id;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const apiUrl    = process.env.API_URL    || `http://localhost:${process.env.PORT || 5000}`;
    try {
        res.json(await momoService.createPayment(bookingId, userId, clientUrl, apiUrl));
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/checkout/momo/verify  body: redirect URL params
export async function verifyMomoPayment(req, res) {
    const { bookingId } = req.params;
    try {
        res.json(await momoService.verifyReturn(req.body, bookingId));
    } catch (error) { handleError(res, error); }
}

// ── VNPay ────────────────────────────────────────────────────────────────────

// POST /api/bookings/:bookingId/checkout/vnpay
export async function createVnpayPayment(req, res) {
    const { bookingId } = req.params;
    const userId    = req.user?.id;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const apiUrl    = process.env.API_URL    || `http://localhost:${process.env.PORT || 5000}`;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    try {
        res.json(await vnpayService.createPaymentUrl(bookingId, userId, clientUrl, apiUrl, ipAddress));
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/checkout/vnpay/verify  body: redirect URL params
export async function verifyVnpayPayment(req, res) {
    try {
        res.json(await vnpayService.verifyReturn(req.body));
    } catch (error) { handleError(res, error); }
}

// ── ZaloPay ──────────────────────────────────────────────────────────────────

// POST /api/bookings/:bookingId/checkout/zalopay
export async function createZalopayOrder(req, res) {
    const { bookingId } = req.params;
    const userId    = req.user?.id;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const apiUrl    = process.env.API_URL    || `http://localhost:${process.env.PORT || 5000}`;
    try {
        res.json(await zalopayService.createOrder(bookingId, userId, clientUrl, apiUrl));
    } catch (error) { handleError(res, error); }
}

// POST /api/bookings/:bookingId/checkout/zalopay/verify
export async function verifyZalopayOrder(req, res) {
    const { bookingId } = req.params;
    const userId = req.user?.id;
    try {
        res.json(await zalopayService.verifyOrder(bookingId, userId));
    } catch (error) { handleError(res, error); }
}

import crypto from "crypto";
import prisma from "../db.cjs";
import { BOOKING_INCLUDE } from "./bookingService.js";

const TEST_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create";
const LIVE_ENDPOINT = "https://payment.momo.vn/v2/gateway/api/create";

function endpoint() {
    return process.env.MOMO_ENV === "live" ? LIVE_ENDPOINT : TEST_ENDPOINT;
}

function hmac256(secret, data) {
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function credentials() {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey   = process.env.MOMO_ACCESS_KEY;
    const secretKey   = process.env.MOMO_SECRET_KEY;
    if (!partnerCode || !accessKey || !secretKey) throw new Error("MoMo credentials are not set");
    return { partnerCode, accessKey, secretKey };
}

async function getBookingOrThrow(bookingId, userId) {
    const b = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: { field: { select: { name: true } } },
    });
    if (!b)                    throw new Error("Booking not found");
    if (b.userId !== userId)   throw new Error("Not authorized");
    if (b.paymentStatus === "paid") throw new Error("Booking is already paid");
    return b;
}

// ─── Create payment ───────────────────────────────────────────────────────────

export async function createPayment(bookingId, userId, clientUrl, apiUrl) {
    const { partnerCode, accessKey, secretKey } = credentials();
    const booking = await getBookingOrThrow(bookingId, userId);

    const orderId     = `pitchbook-${bookingId.replace(/-/g, "").slice(0, 10)}-${Date.now()}`;
    const requestId   = orderId;
    const amount      = Math.round(booking.totalPrice);
    const orderInfo   = `PitchBook - ${booking.field?.name ?? "Soccer Field"}`;
    const redirectUrl = `${clientUrl}/bookings/${bookingId}?momo_success=1`;
    const ipnUrl      = `${apiUrl}/api/webhooks/momo`;
    const requestType = "payWithMethod";
    const extraData   = Buffer.from(JSON.stringify({ bookingId })).toString("base64");

    const rawHash = [
        `accessKey=${accessKey}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `ipnUrl=${ipnUrl}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `partnerCode=${partnerCode}`,
        `redirectUrl=${redirectUrl}`,
        `requestId=${requestId}`,
        `requestType=${requestType}`,
    ].join("&");

    const signature = hmac256(secretKey, rawHash);

    const res = await fetch(endpoint(), {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            partnerCode, orderId, requestId, amount,
            orderInfo, redirectUrl, ipnUrl, requestType,
            extraData, lang: "vi", signature,
        }),
    });

    const data = await res.json();
    if (data.resultCode !== 0) throw new Error(data.message ?? "MoMo error");
    return { payUrl: data.payUrl };
}

// ─── Verify return URL params (called by frontend after redirect) ─────────────

export async function verifyReturn(params, bookingId) {
    const { partnerCode, accessKey, secretKey } = credentials();
    const { orderId, requestId, amount, orderInfo, orderType,
            transId, resultCode, message, payType, responseTime, extraData, signature } = params;

    const rawHash = [
        `accessKey=${accessKey}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `message=${message}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `orderType=${orderType}`,
        `partnerCode=${partnerCode}`,
        `payType=${payType}`,
        `requestId=${requestId}`,
        `responseTime=${responseTime}`,
        `resultCode=${resultCode}`,
        `transId=${transId}`,
    ].join("&");

    const expected = hmac256(secretKey, rawHash);
    if (expected !== signature) throw new Error("Invalid MoMo signature");
    if (parseInt(resultCode) !== 0) throw new Error(`MoMo payment failed (code ${resultCode})`);

    return prisma.booking.update({
        where:   { id: bookingId },
        data:    { paymentMethod: "momo", paymentStatus: "paid" },
        include: BOOKING_INCLUDE,
    });
}

// ─── IPN webhook ──────────────────────────────────────────────────────────────

export async function handleIPN(body) {
    try {
        const { partnerCode, accessKey, secretKey } = credentials();
        const { orderId, requestId, amount, orderInfo, orderType,
                transId, resultCode, message, payType, responseTime, extraData, signature } = body;

        const rawHash = [
            `accessKey=${accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `message=${message}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `orderType=${orderType}`,
            `partnerCode=${partnerCode}`,
            `payType=${payType}`,
            `requestId=${requestId}`,
            `responseTime=${responseTime}`,
            `resultCode=${resultCode}`,
            `transId=${transId}`,
        ].join("&");

        const expected = hmac256(secretKey, rawHash);
        if (expected !== signature) return { resultCode: "97", message: "Invalid signature" };
        if (parseInt(resultCode) !== 0) return { resultCode: "00", message: "Acknowledged" };

        const { bookingId } = JSON.parse(Buffer.from(extraData, "base64").toString());
        if (bookingId) {
            await prisma.booking.update({
                where: { id: bookingId },
                data:  { paymentMethod: "momo", paymentStatus: "paid" },
            });
        }
        return { resultCode: "00", message: "Xác nhận thanh toán thành công" };
    } catch (e) {
        console.error("[momo-ipn]", e);
        return { resultCode: "99", message: "Internal error" };
    }
}

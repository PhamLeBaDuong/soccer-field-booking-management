import crypto from "crypto";
import prisma from "../db.cjs";
import { BOOKING_INCLUDE } from "./bookingService.js";

const SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const LIVE_URL    = "https://pay.vnpay.vn/vpcpay.html";

function baseUrl() {
    return process.env.VNPAY_ENV === "live" ? LIVE_URL : SANDBOX_URL;
}

function hmac512(secret, data) {
    return crypto.createHmac("sha512", secret).update(data, "utf8").digest("hex");
}

function formatDateTime(date) {
    const p = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
           `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function buildSignedUrl(base, params, hashSecret) {
    const sorted = Object.keys(params).sort();
    // VNPay signature uses urlencoded querystring (spaces as '+')
    const qs = sorted.map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`).join("&");
    const hash = hmac512(hashSecret, qs);
    return `${base}?${qs}&vnp_SecureHash=${hash}`;
}

function verifyHash(query, hashSecret) {
    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
    const sorted = Object.keys(rest).filter(k => k.startsWith("vnp_")).sort();
    const qs = sorted.map(k => `${k}=${encodeURIComponent(rest[k]).replace(/%20/g, "+")}`).join("&");
    const expected = hmac512(hashSecret, qs);
    return expected === vnp_SecureHash;
}

function credentials() {
    const tmnCode    = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    if (!tmnCode || !hashSecret) throw new Error("VNPay credentials are not set");
    return { tmnCode, hashSecret };
}

// ─── Create payment URL ───────────────────────────────────────────────────────

export async function createPaymentUrl(bookingId, userId, clientUrl, apiUrl, ipAddress) {
    const { tmnCode, hashSecret } = credentials();

    const booking = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: { field: { select: { name: true } } },
    });
    if (!booking)               throw new Error("Booking not found");
    if (booking.userId !== userId) throw new Error("Not authorized");
    if (booking.paymentStatus === "paid") throw new Error("Booking is already paid");

    // VNPay requires amount × 100
    const amount     = Math.round(booking.totalPrice) * 100;
    const txnRef     = `${bookingId.replace(/-/g, "").slice(0, 8)}${Date.now()}`;
    const createDate = formatDateTime(new Date());

    const params = {
        vnp_Version:    "2.1.0",
        vnp_Command:    "pay",
        vnp_TmnCode:    tmnCode,
        vnp_Amount:     String(amount),
        vnp_CurrCode:   "VND",
        vnp_TxnRef:     txnRef,
        // Embed full bookingId for IPN / return verification
        vnp_OrderInfo:  `PitchBook-${bookingId}`,
        vnp_OrderType:  "190000",
        vnp_Locale:     "vn",
        vnp_ReturnUrl:  `${clientUrl}/bookings/${bookingId}?vnpay_success=1`,
        vnp_IpnUrl:     `${apiUrl}/api/webhooks/vnpay`,
        vnp_CreateDate: createDate,
        vnp_IpAddr:     ipAddress || "127.0.0.1",
    };

    return { payUrl: buildSignedUrl(baseUrl(), params, hashSecret) };
}

// ─── Verify & mark paid (shared by IPN GET and return POST) ──────────────────

async function verifyAndMarkPaid(query) {
    const { hashSecret } = credentials();

    if (!verifyHash(query, hashSecret)) throw new Error("Invalid VNPay signature");
    if (query.vnp_ResponseCode !== "00") throw new Error(`VNPay payment failed (${query.vnp_ResponseCode})`);

    const bookingId = query.vnp_OrderInfo?.replace("PitchBook-", "");
    if (!bookingId) throw new Error("Missing bookingId in vnp_OrderInfo");

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found");
    if (booking.paymentStatus === "paid") {
        return prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    }

    return prisma.booking.update({
        where:   { id: bookingId },
        data:    { paymentMethod: "vnpay", paymentStatus: "paid" },
        include: BOOKING_INCLUDE,
    });
}

// ─── Return URL verify (called by frontend after redirect) ───────────────────

export async function verifyReturn(params) {
    return verifyAndMarkPaid(params);
}

// ─── IPN webhook (GET from VNPay server) ─────────────────────────────────────

export async function handleIPN(query) {
    try {
        const { hashSecret } = credentials();
        if (!verifyHash(query, hashSecret)) {
            return { RspCode: "97", Message: "Invalid signature" };
        }
        if (query.vnp_ResponseCode !== "00") {
            return { RspCode: "00", Message: "Confirm Success" };
        }

        const bookingId = query.vnp_OrderInfo?.replace("PitchBook-", "");
        if (!bookingId) return { RspCode: "01", Message: "Order not found" };

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) return { RspCode: "01", Message: "Order not found" };
        if (booking.paymentStatus === "paid") return { RspCode: "02", Message: "Order already confirmed" };

        await prisma.booking.update({
            where: { id: bookingId },
            data:  { paymentMethod: "vnpay", paymentStatus: "paid" },
        });
        return { RspCode: "00", Message: "Confirm Success" };
    } catch (e) {
        console.error("[vnpay-ipn]", e);
        return { RspCode: "99", Message: "Internal error" };
    }
}

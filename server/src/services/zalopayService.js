import crypto from "crypto";
import prisma from "../db.cjs";
import { BOOKING_INCLUDE } from "./bookingService.js";

const SANDBOX_CREATE = "https://sb-openapi.zalopay.vn/v2/create";
const LIVE_CREATE    = "https://openapi.zalopay.vn/v2/create";
const SANDBOX_QUERY  = "https://sb-openapi.zalopay.vn/v2/query";
const LIVE_QUERY     = "https://openapi.zalopay.vn/v2/query";

function createUrl() { return process.env.ZALOPAY_ENV === "live" ? LIVE_CREATE : SANDBOX_CREATE; }
function queryUrl()  { return process.env.ZALOPAY_ENV === "live" ? LIVE_QUERY  : SANDBOX_QUERY;  }

function hmac256(secret, data) {
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function transDate(date) {
    const p = (n) => String(n).padStart(2, "0");
    return `${String(date.getFullYear()).slice(2)}${p(date.getMonth() + 1)}${p(date.getDate())}`;
}

function credentials() {
    const appId = process.env.ZALOPAY_APP_ID;
    const key1  = process.env.ZALOPAY_KEY1;
    const key2  = process.env.ZALOPAY_KEY2;
    if (!appId || !key1 || !key2) throw new Error("ZaloPay credentials are not set");
    return { appId, key1, key2 };
}

// ─── Create order ─────────────────────────────────────────────────────────────

export async function createOrder(bookingId, userId, clientUrl, apiUrl) {
    const { appId, key1 } = credentials();

    const booking = await prisma.booking.findUnique({
        where:   { id: bookingId },
        include: { field: { select: { name: true } } },
    });
    if (!booking)               throw new Error("Booking not found");
    if (booking.userId !== userId) throw new Error("Not authorized");
    if (booking.paymentStatus === "paid") throw new Error("Booking is already paid");

    const now        = new Date();
    const appTransId = `${transDate(now)}_pitchbook_${bookingId.replace(/-/g, "").slice(0, 10)}`;
    const appTime    = now.getTime();
    const amount     = Math.round(booking.totalPrice);
    const item       = JSON.stringify([{
        itemid:       bookingId,
        itemname:     booking.field?.name ?? "Soccer Field",
        itemprice:    amount,
        itemquantity: 1,
    }]);
    const description = `PitchBook - ${booking.field?.name ?? "Soccer Field"}`;
    const embedData   = JSON.stringify({
        bookingId,
        appTransId,
        redirecturl: `${clientUrl}/bookings/${bookingId}?zalopay_success=1`,
    });
    const callbackUrl = `${apiUrl}/api/webhooks/zalopay`;

    const macData = `${appId}|${appTransId}|${userId}|${amount}|${appTime}|${embedData}|${item}`;
    const mac     = hmac256(key1, macData);

    const body = new URLSearchParams({
        app_id:       appId,
        app_trans_id: appTransId,
        app_user:     userId,
        amount:       String(amount),
        app_time:     String(appTime),
        item,
        description,
        embed_data:   embedData,
        callback_url: callbackUrl,
        bank_code:    "",
        mac,
    });

    const res = await fetch(createUrl(), {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    const data = await res.json();
    if (data.return_code !== 1) throw new Error(data.return_message ?? "ZaloPay error");
    return { payUrl: data.order_url };
}

// ─── Callback webhook (POST from ZaloPay server) ──────────────────────────────

export async function handleCallback(body) {
    try {
        const { key2 } = credentials();
        const expected = hmac256(key2, body.data);
        if (expected !== body.mac) {
            return { return_code: -1, return_message: "mac not equal" };
        }

        const dataObj   = JSON.parse(body.data);
        const embedData = JSON.parse(dataObj.embed_data ?? "{}");
        const bookingId = embedData.bookingId;

        if (bookingId) {
            const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
            if (booking && booking.paymentStatus !== "paid") {
                await prisma.booking.update({
                    where: { id: bookingId },
                    data:  { paymentMethod: "zalopay", paymentStatus: "paid" },
                });
            }
        }
        return { return_code: 1, return_message: "success" };
    } catch (e) {
        console.error("[zalopay-callback]", e);
        return { return_code: 0, return_message: "Internal error" };
    }
}

// ─── Verify order status (called by frontend after redirect) ─────────────────

export async function verifyOrder(bookingId, userId) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking)                 throw new Error("Booking not found");
    if (booking.userId !== userId)   throw new Error("Not authorized");

    // If IPN already marked it paid, return the booking
    if (booking.paymentStatus === "paid") {
        return prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    }

    // IPN hasn't arrived yet — tell the frontend to retry
    return { pending: true, message: "Payment is being processed. Please refresh in a moment." };
}

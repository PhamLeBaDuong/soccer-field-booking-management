import express from "express";
import {
    getBookingById,
    getBookingsByUserId,
    getOccupiedSlots,
    getPaymentOptions,
    payBooking,
    createStripeCheckout,
    verifyStripePayment,
    createPaypalOrder,
    capturePaypalPayment,
    createMomoPayment,
    verifyMomoPayment,
    createVnpayPayment,
    verifyVnpayPayment,
    createZalopayOrder,
    verifyZalopayOrder,
} from "../controllers/bookingController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Slot availability feed — unauthenticated
router.get("/occupied", getOccupiedSlots);

// Authenticated routes
router.use(authenticate);

router.get("/user/:userId",                          getBookingsByUserId);
router.get("/:bookingId/payment-options",            getPaymentOptions);
router.post("/:bookingId/pay",                       payBooking);
router.post("/:bookingId/checkout/stripe",           createStripeCheckout);
router.post("/:bookingId/checkout/stripe/verify",    verifyStripePayment);
router.post("/:bookingId/checkout/paypal",           createPaypalOrder);
router.post("/:bookingId/checkout/paypal/capture",   capturePaypalPayment);
router.post("/:bookingId/checkout/momo",             createMomoPayment);
router.post("/:bookingId/checkout/momo/verify",      verifyMomoPayment);
router.post("/:bookingId/checkout/vnpay",            createVnpayPayment);
router.post("/:bookingId/checkout/vnpay/verify",     verifyVnpayPayment);
router.post("/:bookingId/checkout/zalopay",          createZalopayOrder);
router.post("/:bookingId/checkout/zalopay/verify",   verifyZalopayOrder);
router.get("/:bookingId",                            getBookingById);

export default router;

import express from "express";
import {
    createBooking,
    getBookingById,
    getFieldByBookingId,
    getBookingsByUserId,
    getAvailableBookings,
    getMachingBookingsByField,
    getMatchingBookings,
    matchBooking,
    confirmBooking,
    cancelBooking,
    updateBooking,
} from "../controllers/bookingController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All booking routes require a valid token
router.use(authenticate);

// Static routes MUST come before dynamic /:bookingId routes to avoid param conflicts
router.get("/available", getAvailableBookings);
router.get("/matching", getMatchingBookings);
router.get("/matchingbyfieldid", getMachingBookingsByField);
router.get("/user/:userId", getBookingsByUserId);
router.post("/match", matchBooking);

// Dynamic routes
router.post("/", createBooking);
router.get("/:bookingId", getBookingById);
router.get("/:bookingId/field", getFieldByBookingId);
router.post("/confirm/:bookingId", confirmBooking);
router.put("/:bookingId", updateBooking);
router.delete("/:bookingId", cancelBooking);

export default router;

import express from "express";
import {
    createBooking,
    getBookingById,
    getFieldByBookingId,
    getBookingsByUserId,
    getOccupiedSlots,
    confirmBooking,
    cancelBooking,
    updateBooking,
    findMatchesForBooking,
} from "../controllers/bookingController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

// Static routes first — prevents /:bookingId from swallowing them
router.get("/occupied",          getOccupiedSlots);      // ?fieldId&startTime&endTime
router.get("/user/:userId",      getBookingsByUserId);

// Single-booking CRUD
router.post("/",                 createBooking);
router.get("/:bookingId",        getBookingById);
router.get("/:bookingId/field",  getFieldByBookingId);
router.put("/:bookingId",        updateBooking);
router.delete("/:bookingId",     cancelBooking);
router.post("/:bookingId/confirm",  confirmBooking);

// Match-finding — returns candidates; the user then calls POST /api/matches/request
router.get("/:bookingId/matches", findMatchesForBooking);

export default router;

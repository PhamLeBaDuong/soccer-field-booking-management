import express from "express";
import {
    getBookingById,
    getBookingsByUserId,
    getOccupiedSlots,
} from "../controllers/bookingController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Slot availability feed — used by frontend calendar (unauthenticated is fine)
router.get("/occupied", getOccupiedSlots);  // ?fieldId&startTime&endTime

// Authenticated read routes
router.use(authenticate);

router.get("/user/:userId",   getBookingsByUserId);
router.get("/:bookingId",     getBookingById);

export default router;

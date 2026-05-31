import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    getMyComplexes, getMyComplex,
    createComplex, updateComplex, deleteComplex,
    getFieldsForComplex, createField, updateField, deleteField,
    getVenueFieldSchedule, createManualBooking,
} from "../controllers/venueController.js";

const router = Router();

// All venue routes require authentication — no admin role needed
router.use(authenticate);

// Complexes
router.get("/complexes",          getMyComplexes);
router.get("/complexes/:id",      getMyComplex);
router.post("/complexes",         createComplex);
router.put("/complexes/:id",      updateComplex);
router.delete("/complexes/:id",   deleteComplex);

// Fields scoped under a complex
router.get("/complexes/:complexId/fields",    getFieldsForComplex);
router.post("/complexes/:complexId/fields",   createField);

// Field update/delete/schedule/manual-booking by field id
router.put("/fields/:id",                    updateField);
router.delete("/fields/:id",                 deleteField);
router.get("/fields/:id/schedule",           getVenueFieldSchedule);
router.post("/fields/:id/manual-booking",    createManualBooking);

export default router;

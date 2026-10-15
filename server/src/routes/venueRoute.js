import { Router, raw } from "express";
import { managePhotos } from "../controllers/photoController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    getMyComplexes, getMyComplex,
    createComplex, updateComplex, deleteComplex,
    getFieldsForComplex, createField, updateField, deleteField,
    getVenueFieldSchedule, getComplexSchedule, createManualBooking,
} from "../controllers/venueController.js";

const router = Router();

// All venue routes require authentication — no admin role needed
router.use(authenticate);

router.post("/:kind/:id/photos", raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }), managePhotos);
router.put("/:kind/:id/photos", managePhotos);
router.delete("/:kind/:id/photos/:name", managePhotos);
router.use((error, req, res, next) => {
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Choose an image up to 5 MB." });
    next(error);
});

// Complexes
router.get("/complexes",          getMyComplexes);
router.get("/complexes/:id",      getMyComplex);
router.post("/complexes",         createComplex);
router.put("/complexes/:id",      updateComplex);
router.delete("/complexes/:id",   deleteComplex);

// Fields scoped under a complex
router.get("/complexes/:complexId/fields",    getFieldsForComplex);
router.post("/complexes/:complexId/fields",   createField);
router.get("/complexes/:complexId/schedule",  getComplexSchedule);

// Field update/delete/schedule/manual-booking by field id
router.put("/fields/:id",                    updateField);
router.delete("/fields/:id",                 deleteField);
router.get("/fields/:id/schedule",           getVenueFieldSchedule);
router.post("/fields/:id/manual-booking",    createManualBooking);

export default router;

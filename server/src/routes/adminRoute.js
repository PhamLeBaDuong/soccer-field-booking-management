import express from "express";
import {
    getAllComplexes,
    getAllFields,
    getComplexById,
    getFieldsByComplexId,
    addComplex,
    addField,
    updateComplex,
    updateField,
    deleteComplex,
    deleteField,
    getFieldSchedule,
    setMatchResult,
} from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// All admin routes require a valid token + admin role
router.use(authenticate, requireAdmin);

// Complexes
router.get("/complexes", getAllComplexes);
router.get("/complexes/:id", getComplexById);
router.post("/complexes", addComplex);
router.put("/complexes/:id", updateComplex);
router.delete("/complexes/:id", deleteComplex);

// Fields
router.get("/fields",                           getAllFields);
router.get("/complexes/:complexId/fields",      getFieldsByComplexId);
router.post("/fields",                          addField);
router.put("/fields/:id",                       updateField);
router.delete("/fields/:id",                    deleteField);
router.get("/fields/:fieldId/schedule",         getFieldSchedule);

// Match results
router.put("/matches/:matchId/result",          setMatchResult);

export default router;

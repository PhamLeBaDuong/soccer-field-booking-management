import express from "express";
import { getAllFields, getNearbyFields, getFieldById } from "../controllers/fieldController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All field queries require a valid token (read-only, any role)
router.use(authenticate);

// Static routes before dynamic /:fieldId
router.get("/nearby",    getNearbyFields);  // ?lat=X&lng=Y&radius=km  (default 50 km)
router.get("/",          getAllFields);      // ?complexId=&type=&indoor=&lights=

// Per-field
router.get("/:fieldId",  getFieldById);

export default router;

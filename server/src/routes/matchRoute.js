import express from "express";
import {
    requestMatch,
    getMatch,
    confirmMatch,
    cancelMatch,
} from "../controllers/matchController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All match routes require a valid token
router.use(authenticate);

// Static routes before dynamic /:matchId
router.post("/request",          requestMatch);   // auto-matchmaking queue

// Per-match operations
router.get("/:matchId",          getMatch);
router.post("/:matchId/confirm", confirmMatch);
router.delete("/:matchId",       cancelMatch);

export default router;

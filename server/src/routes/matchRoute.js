import express from "express";
import {
    getMyMatches,
    getMatch,
    cancelMatch,
} from "../controllers/matchController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticate);

router.get("/mine",         getMyMatches);
router.get("/:matchId",     getMatch);
router.delete("/:matchId",  cancelMatch);

export default router;

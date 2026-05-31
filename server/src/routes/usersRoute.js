import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { searchUsers, getUserProfile } from "../controllers/usersController.js";

const router = Router();

router.use(authenticate);

router.get("/search",      searchUsers);
router.get("/:userId",     getUserProfile);

export default router;

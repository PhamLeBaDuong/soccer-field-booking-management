import express from "express";
import { register, login, getUserId } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getUserId); // protected: returns userId from token

export default router;

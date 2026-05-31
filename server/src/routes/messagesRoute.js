import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getConversationList, getConversation, sendMessage } from "../controllers/messagesController.js";

const router = Router();
router.use(authenticate);

router.get("/",           getConversationList);
router.get("/:userId",    getConversation);
router.post("/:userId",   sendMessage);

export default router;

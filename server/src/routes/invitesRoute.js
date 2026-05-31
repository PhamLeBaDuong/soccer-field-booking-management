import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { sendInvite, getMyInvites, acceptInvite, declineInvite } from "../controllers/invitesController.js";

const router = Router();
router.use(authenticate);

router.get("/mine",                              getMyInvites);
router.post("/team/:teamId/user/:inviteeId",     sendInvite);
router.post("/:inviteId/accept",                 acceptInvite);
router.post("/:inviteId/decline",                declineInvite);

export default router;

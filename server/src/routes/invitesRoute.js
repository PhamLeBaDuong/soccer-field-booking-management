import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { sendInvite, getMyInvites, acceptInvite, declineInvite } from "../controllers/invitesController.js";
import { readLink, readMyLink, createLink, listLinks, revokeLink, respondLink, getTeamLink, getResourceLink } from "../controllers/shareInvitationController.js";

const router = Router();
router.get("/links/:token", readLink);
router.use(authenticate);
router.get("/team-link/:teamId", getTeamLink);
router.get("/resource-link/:kind/:targetId", getResourceLink);

router.post("/links", createLink);
router.get("/links/manage/:kind/:targetId", listLinks);
router.get("/links/:token/mine", readMyLink);
router.post("/links/:token/respond", respondLink);
router.delete("/links/:id", revokeLink);

router.get("/mine",                              getMyInvites);
router.post("/team/:teamId/user/:inviteeId",     sendInvite);
router.post("/:inviteId/accept",                 acceptInvite);
router.post("/:inviteId/decline",                declineInvite);

export default router;

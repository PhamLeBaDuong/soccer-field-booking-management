import express from "express";
import {
    createTeam,
    getMyTeams,
    getTeamById,
    updateTeam,
    disbandTeam,
    addMember,
    removeMember,
} from "../controllers/teamController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticate);

router.post("/",                             createTeam);
router.get("/mine",                          getMyTeams);
router.get("/:teamId",                       getTeamById);
router.put("/:teamId",                       updateTeam);
router.delete("/:teamId",                    disbandTeam);
router.post("/:teamId/members",              addMember);
router.delete("/:teamId/members/:userId",    removeMember);

export default router;

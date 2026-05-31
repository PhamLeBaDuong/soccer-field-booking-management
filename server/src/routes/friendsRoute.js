import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    getFriends, getFriendRequests,
    sendFriendRequest, acceptFriendRequest, removeFriend,
} from "../controllers/friendsController.js";

const router = Router();
router.use(authenticate);

router.get("/",                      getFriends);
router.get("/requests",              getFriendRequests);
router.post("/request/:userId",      sendFriendRequest);
router.post("/accept/:senderId",     acceptFriendRequest);
router.delete("/:userId",            removeFriend);

export default router;

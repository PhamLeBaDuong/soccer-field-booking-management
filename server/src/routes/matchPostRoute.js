import express from "express";
import {
    createMatchPost,
    getMyMatchPosts,
    listMatchPosts,
    getMatchPost,
    acceptMatchPost,
    cancelMatchPost,
} from "../controllers/matchPostController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public listing is unauthenticated — browsing is open
router.get("/",           listMatchPosts);

// All mutation routes require auth
router.use(authenticate);

router.get("/mine",                       getMyMatchPosts);
router.post("/",                          createMatchPost);
router.get("/:postId",                    getMatchPost);        // ?code= for private
router.post("/:postId/accept",            acceptMatchPost);
router.delete("/:postId",                 cancelMatchPost);

export default router;

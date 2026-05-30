import express from "express";
import {
    createLobby,
    getMyLobbies,
    listLobbies,
    getLobbyById,
    joinLobby,
    leaveLobby,
    cancelLobby,
} from "../controllers/lobbyController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Browsing lobbies is public
router.get("/",           listLobbies);
router.get("/:lobbyId",   getLobbyById);

// Mutations + personal routes require auth
router.use(authenticate);

router.get("/mine",                   getMyLobbies);
router.post("/",                      createLobby);
router.post("/:lobbyId/join",         joinLobby);
router.delete("/:lobbyId/leave",      leaveLobby);
router.delete("/:lobbyId",            cancelLobby);

export default router;

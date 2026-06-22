import http             from "http";
import express          from "express";
import cors             from "cors";
import dotenv           from "dotenv";
import jwt              from "jsonwebtoken";
import { Server }       from "socket.io";
import prisma           from "./db.cjs";
import { setIO }        from "./socket.js";
import authRoutes       from "./routes/authRoute.js";
import adminRoutes      from "./routes/adminRoute.js";
import fieldRoutes      from "./routes/fieldRoute.js";
import bookingRoutes    from "./routes/bookingRoute.js";
import matchRoutes      from "./routes/matchRoute.js";
import teamRoutes       from "./routes/teamRoute.js";
import matchPostRoutes  from "./routes/matchPostRoute.js";
import lobbyRoutes      from "./routes/lobbyRoute.js";
import venueRoutes      from "./routes/venueRoute.js";
import usersRoutes      from "./routes/usersRoute.js";
import friendsRoutes    from "./routes/friendsRoute.js";
import messagesRoutes   from "./routes/messagesRoute.js";
import invitesRoutes    from "./routes/invitesRoute.js";
import { runCleanup }   from "./services/cleanupService.js";
import webhookRoutes   from "./routes/webhookRoute.js";

dotenv.config();

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// ── Socket.io ─────────────────────────────────────────────────────────────────

const io = new Server(server, {
    cors: { origin: CLIENT_URL, credentials: true },
});

// JWT auth on every socket handshake
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error("Unauthorized"));
    }
});

io.on("connection", (socket) => {
    // Each user joins their own private room so we can target them
    socket.join(socket.user.id);

    // ── Chat: send message ─────────────────────────────────────────────────
    socket.on("message:send", async ({ recipientId, content }) => {
        if (!recipientId || !content?.trim()) return;
        try {
            const msg = await prisma.chatMessage.create({
                data: { senderId: socket.user.id, receiverId: recipientId, content: content.trim() },
                include: {
                    sender:   { select: { id: true, name: true, username: true } },
                    receiver: { select: { id: true, name: true, username: true } },
                },
            });
            // Deliver to recipient and echo back to sender
            io.to(recipientId).emit("message:receive", msg);
            socket.emit("message:sent", msg);
        } catch (err) {
            console.error("[socket] message:send error", err);
        }
    });

    // ── Chat: mark as read ─────────────────────────────────────────────────
    socket.on("message:read", async ({ senderId }) => {
        if (!senderId) return;
        try {
            await prisma.chatMessage.updateMany({
                where: { senderId, receiverId: socket.user.id, readAt: null },
                data:  { readAt: new Date() },
            });
            io.to(senderId).emit("message:read_ack", { by: socket.user.id });
        } catch (err) {
            console.error("[socket] message:read error", err);
        }
    });
});

// Register io in the singleton so controllers can emit events
setIO(io);

// ── Express middleware ─────────────────────────────────────────────────────────

app.use(cors({ origin: CLIENT_URL, credentials: true }));

// Stripe webhook needs raw body — register BEFORE express.json()
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Soccer field booking API is running!" });
});

app.use("/api/auth",         authRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/fields",       fieldRoutes);
app.use("/api/bookings",     bookingRoutes);
app.use("/api/matches",      matchRoutes);
app.use("/api/teams",        teamRoutes);
app.use("/api/match-posts",  matchPostRoutes);
app.use("/api/lobbies",      lobbyRoutes);
app.use("/api/venues",       venueRoutes);
app.use("/api/users",        usersRoutes);
app.use("/api/friends",      friendsRoutes);
app.use("/api/messages",     messagesRoutes);
app.use("/api/invites",      invitesRoutes);

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    runCleanup();
    setInterval(runCleanup, CLEANUP_INTERVAL_MS);
});

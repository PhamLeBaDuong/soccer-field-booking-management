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

dotenv.config();

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
// Cleanup sweep cadence. Each run queries the DB, so a short interval keeps a
// scale-to-zero database (e.g. Neon free tier) awake around the clock — and
// with keep-alive enabled the backend never sleeps either, so the sweep would
// run 24/7 and drain the compute budget. Default to a generous 30 min.
// Override with CLEANUP_INTERVAL_MIN, or set CLEANUP_ENABLED=false to run
// cleanup elsewhere (e.g. an external cron job).
const CLEANUP_ENABLED      = process.env.CLEANUP_ENABLED !== "false";
const CLEANUP_INTERVAL_MIN = Number(process.env.CLEANUP_INTERVAL_MIN) || 30;
const CLEANUP_INTERVAL_MS  = CLEANUP_INTERVAL_MIN * 60 * 1000;
// Render free instances spin down after ~15 min idle; ping just under that.
const KEEPALIVE_INTERVAL_MS = 14 * 60 * 1000;

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
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Soccer field booking API is running!" });
});

// Lightweight health check — no DB hit, cheap to ping (used by keep-alive).
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
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

// ── Keep-alive (Render free tier) ───────────────────────────────────────────
// Self-ping our own public URL just under the idle window so the instance
// never spins down (avoids 50s cold starts). Only runs on Render, where
// RENDER_EXTERNAL_URL is set automatically — never locally. An external pinger
// (e.g. UptimeRobot) on /health is more robust; this is a zero-setup fallback.
function startKeepAlive() {
    const url = process.env.RENDER_EXTERNAL_URL;
    if (!url) return;
    setInterval(async () => {
        try {
            const res = await fetch(`${url}/health`);
            console.log(`[keepalive] ${url}/health → ${res.status}`);
        } catch (err) {
            console.error("[keepalive] ping failed:", err.message);
        }
    }, KEEPALIVE_INTERVAL_MS);
}

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    if (CLEANUP_ENABLED) {
        runCleanup();
        setInterval(runCleanup, CLEANUP_INTERVAL_MS);
        console.log(`🧹 Cleanup sweep every ${CLEANUP_INTERVAL_MIN} min`);
    } else {
        console.log("🧹 In-process cleanup disabled (CLEANUP_ENABLED=false)");
    }
    startKeepAlive();
});

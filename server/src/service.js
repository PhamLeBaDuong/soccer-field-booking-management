// Generic single-domain service entrypoint. Boots an Express app that serves
// ONE bounded context's routes, chosen by the SERVICE env var. It's the same
// image as the monolith — we just mount a subset of the existing routers.
// Shares the DB for now (distributed compute, shared data); giving each service
// its own database is the next step.
import express      from "express";
import cors         from "cors";
import dotenv       from "dotenv";

// ── catalog ───────────────────────────────────────────────────────────────────
import fieldRoutes   from "./routes/fieldRoute.js";
import venueRoutes   from "./routes/venueRoute.js";

// ── auth ──────────────────────────────────────────────────────────────────────
import authRoutes    from "./routes/authRoute.js";
import usersRoutes   from "./routes/usersRoute.js";
import adminRoutes   from "./routes/adminRoute.js";

// ── booking ───────────────────────────────────────────────────────────────────
import bookingRoutes from "./routes/bookingRoute.js";
import webhookRoutes from "./routes/webhookRoute.js";

// ── social ────────────────────────────────────────────────────────────────────
import friendsRoutes  from "./routes/friendsRoute.js";
import messagesRoutes from "./routes/messagesRoute.js";
import invitesRoutes  from "./routes/invitesRoute.js";

// ── match ─────────────────────────────────────────────────────────────────────
import matchRoutes     from "./routes/matchRoute.js";
import matchPostRoutes from "./routes/matchPostRoute.js";
import lobbyRoutes     from "./routes/lobbyRoute.js";
import teamRoutes      from "./routes/teamRoute.js";

dotenv.config();

const SERVICE    = process.env.SERVICE || "catalog";
const PORT       = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Which routers each service owns, mounted at the SAME base paths the monolith
// uses — so the gateway can route by path with zero changes to the frontend.
const SERVICES = {
    // ── Catalog: field & venue inventory ─────────────────────────────────────
    catalog: [
        ["/api/fields", fieldRoutes],
        ["/api/venues", venueRoutes],
    ],

    // ── Auth: identity, users, administration ─────────────────────────────────
    // Note: webhook routes need raw body for Stripe; the booking service hosts
    // them instead so express.raw() is applied before express.json() there.
    auth: [
        ["/api/auth",  authRoutes],
        ["/api/users", usersRoutes],
        ["/api/admin", adminRoutes],
    ],

    // ── Booking: reservations + payment webhooks ───────────────────────────────
    booking: [
        ["/api/bookings", bookingRoutes],
        // Stripe/MoMo/VNPay/ZaloPay callbacks live here because they need raw
        // body access before express.json() is applied (see special mount below).
        ["/api/webhooks", webhookRoutes],
    ],

    // ── Social: friends, chat, invitations ────────────────────────────────────
    social: [
        ["/api/friends",  friendsRoutes],
        ["/api/messages", messagesRoutes],
        ["/api/invites",  invitesRoutes],
    ],

    // ── Match: matches, match-posts, lobbies, teams ───────────────────────────
    match: [
        ["/api/matches",      matchRoutes],
        ["/api/match-posts",  matchPostRoutes],
        ["/api/lobbies",      lobbyRoutes],
        ["/api/teams",        teamRoutes],
    ],
};

const mounts = SERVICES[SERVICE];
if (!mounts) {
    console.error(`Unknown SERVICE "${SERVICE}". Known: ${Object.keys(SERVICES).join(", ")}`);
    process.exit(1);
}

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));

// ── Special handling for the booking service ───────────────────────────────────
// Stripe webhook verification requires the raw request body to arrive before
// express.json() parses it. Mount /api/webhooks FIRST — the router itself calls
// express.raw() internally for /stripe, express.json() for MoMo/ZaloPay.
if (SERVICE === "booking") {
    const webhookEntry = mounts.find(([base]) => base === "/api/webhooks");
    if (webhookEntry) app.use(webhookEntry[0], webhookEntry[1]);
}

app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: SERVICE }));

for (const [base, router] of mounts) {
    // Skip /api/webhooks for booking — already mounted above
    if (SERVICE === "booking" && base === "/api/webhooks") continue;
    app.use(base, router);
}

app.listen(PORT, () => {
    console.log(`🧩 [${SERVICE}] service on :${PORT} → ${mounts.map((m) => m[0]).join(", ")}`);
});

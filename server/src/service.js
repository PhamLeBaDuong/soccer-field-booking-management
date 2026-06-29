// Generic single-domain service entrypoint. Boots an Express app that serves
// ONE bounded context's routes, chosen by the SERVICE env var. It's the same
// image as the monolith — we just mount a subset of the existing routers.
// Shares the DB for now (distributed compute, shared data); giving each service
// its own database is the next step.
import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";

import fieldRoutes from "./routes/fieldRoute.js";
import venueRoutes from "./routes/venueRoute.js";

dotenv.config();

const SERVICE    = process.env.SERVICE || "catalog";
const PORT       = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Which routers each service owns, mounted at the SAME base paths the monolith
// uses — so the gateway can route by path with zero changes to the frontend.
const SERVICES = {
    catalog: [
        ["/api/fields", fieldRoutes],
        ["/api/venues", venueRoutes],
    ],
};

const mounts = SERVICES[SERVICE];
if (!mounts) {
    console.error(`Unknown SERVICE "${SERVICE}". Known: ${Object.keys(SERVICES).join(", ")}`);
    process.exit(1);
}

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: SERVICE }));

for (const [base, router] of mounts) {
    app.use(base, router);
}

app.listen(PORT, () => {
    console.log(`🧩 [${SERVICE}] service on :${PORT} → ${mounts.map((m) => m[0]).join(", ")}`);
});

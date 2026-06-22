import express from "express";
import { handleWebhook }  from "../services/stripeService.js";
import { handleIPN as momoIPN }         from "../services/momoService.js";
import { handleIPN as vnpayIPN }        from "../services/vnpayService.js";
import { handleCallback as zalopayCallback } from "../services/zalopayService.js";

const router = express.Router();

// ── Stripe — needs raw body for signature verification ────────────────────────
router.post(
    "/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        const sig = req.headers["stripe-signature"];
        try {
            res.json(await handleWebhook(req.body, sig));
        } catch (e) {
            console.error("[webhook/stripe]", e.message);
            res.status(400).json({ error: e.message });
        }
    },
);

// ── MoMo — POST JSON ──────────────────────────────────────────────────────────
router.post(
    "/momo",
    express.json(),
    async (req, res) => {
        const result = await momoIPN(req.body);
        res.json(result);
    },
);

// ── VNPay — GET with query params ─────────────────────────────────────────────
router.get(
    "/vnpay",
    async (req, res) => {
        const result = await vnpayIPN(req.query);
        res.json(result);
    },
);

// ── ZaloPay — POST JSON { data, mac } ─────────────────────────────────────────
router.post(
    "/zalopay",
    express.json(),
    async (req, res) => {
        const result = await zalopayCallback(req.body);
        res.json(result);
    },
);

export default router;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoute.js";
import adminRoutes from "./routes/adminRoute.js";
import fieldRoutes from "./routes/fieldRoute.js";
import bookingRoutes from "./routes/bookingRoute.js";
import matchRoutes from "./routes/matchRoute.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Soccer field booking API is running!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/matches", matchRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

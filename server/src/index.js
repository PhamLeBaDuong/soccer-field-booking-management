import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoute.js";

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

// Example booking route
app.get("/bookings", (req, res) => {
  res.json([
    { id: 1, field: "Field A", time: "2025-08-20 18:00", status: "confirmed" },
    { id: 2, field: "Field B", time: "2025-08-21 20:00", status: "pending" }
  ]);
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Verifies JWT and attaches decoded user to req.user
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username, role }
        next();
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }
}

// Must be used after authenticate — checks that the user has admin role
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    next();
}
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db.cjs";
import dotenv from "dotenv";
dotenv.config();


const saltRounds = 10;

export async function register(req, res) {
    const { username, password, name, email, phone } = req.body;

    if (!username || !password || !name || !email) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists

    const existingUser = await prisma.user.findUnique({
        where: { username },
    });

    if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }
    if (email != null && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }


    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = await prisma.user.create({
            data: {
                username: username,
                name: name,
                email: email,
                phone: phone || null,
                password: hashedPassword,
            },
        });
        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function login(req, res) {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        res.json({ message: "Login successful", token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
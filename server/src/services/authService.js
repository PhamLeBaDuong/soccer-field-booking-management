import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db.cjs";
import dotenv from "dotenv";
dotenv.config();


const saltRounds = 10;  
export async function register(username, password, name, email, phone) {
    // const { username, password, name, email, phone } = req.body;

    if (!username || !password || !name || !email) {
        throw new Error("Missing required fields");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { username },
    });

    if (existingUser) {
        throw new Error("Username already exists");
    }
    
    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
    }
    
    if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new Error("Invalid email format");
    }

    // try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = await prisma.user.create({
            data: {
                username,
                name,
                email,
                phone: phone || null,
                password: hashedPassword,
            },
        });

        return user;
    //     res.status(201).json({ message: "User registered successfully", user });
    // } catch (error) {
    //     console.error("Registration error:", error);
    //     res.status(500).json({ error: "Internal server error" });
    // }
}

export async function login(username, password) {
    // const { username, password } = req.body;

    // try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error("Invalid password");
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return { token, user };
        // res.status(200).json({ message: "Login successful", token });
    // } catch (error) {
    //     console.error("Login error:", error);
    //     res.status(500).json({ error: "Internal server error" });
    // }
}
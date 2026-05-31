import prisma from "../db.cjs";

// GET /api/users/search?q=   — search users by name or username (excludes self)
export async function searchUsers(req, res) {
    const q = (req.query.q ?? "").trim();
    if (!q) return res.json([]);
    try {
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: req.user.id } },
                    {
                        OR: [
                            { name:     { contains: q, mode: "insensitive" } },
                            { username: { contains: q, mode: "insensitive" } },
                        ],
                    },
                ],
            },
            select: { id: true, name: true, username: true, role: true },
            take: 20,
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// GET /api/users/:userId  — public profile
export async function getUserProfile(req, res) {
    try {
        const user = await prisma.user.findUnique({
            where:  { id: req.params.userId },
            select: { id: true, name: true, username: true, role: true, createdAt: true },
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

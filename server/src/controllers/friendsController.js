import prisma from "../db.cjs";

function handleError(res, error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not found") || msg.includes("already") || msg.includes("cannot")) {
        return res.status(400).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// GET /api/friends  — list accepted friends
export async function getFriends(req, res) {
    try {
        const rows = await prisma.friendship.findMany({
            where: {
                status: "accepted",
                OR: [{ senderId: req.user.id }, { receiverId: req.user.id }],
            },
            include: {
                sender:   { select: { id: true, name: true, username: true } },
                receiver: { select: { id: true, name: true, username: true } },
            },
        });
        // Return the "other" person from each friendship row
        const friends = rows.map((r) =>
            r.senderId === req.user.id ? r.receiver : r.sender
        );
        res.json(friends);
    } catch (error) { handleError(res, error); }
}

// GET /api/friends/requests  — incoming pending requests
export async function getFriendRequests(req, res) {
    try {
        const rows = await prisma.friendship.findMany({
            where:   { receiverId: req.user.id, status: "pending" },
            include: { sender: { select: { id: true, name: true, username: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json(rows);
    } catch (error) { handleError(res, error); }
}

// POST /api/friends/request/:userId  — send a friend request
export async function sendFriendRequest(req, res) {
    const { userId } = req.params;
    if (userId === req.user.id) return res.status(400).json({ error: "Cannot add yourself" });
    try {
        const target = await prisma.user.findUnique({ where: { id: userId } });
        if (!target) return res.status(404).json({ error: "User not found" });

        // Check if a friendship row already exists in either direction
        const existing = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId: req.user.id, receiverId: userId },
                    { senderId: userId, receiverId: req.user.id },
                ],
            },
        });
        if (existing) {
            if (existing.status === "accepted") return res.status(400).json({ error: "Already friends" });
            if (existing.status === "pending")  return res.status(400).json({ error: "Request already sent" });
            // Declined — allow re-request by updating existing row
            const updated = await prisma.friendship.update({
                where: { id: existing.id },
                data:  { status: "pending", senderId: req.user.id, receiverId: userId },
            });
            return res.status(201).json({ message: "Friend request sent", friendship: updated });
        }

        const friendship = await prisma.friendship.create({
            data: { senderId: req.user.id, receiverId: userId, status: "pending" },
        });
        res.status(201).json({ message: "Friend request sent", friendship });
    } catch (error) { handleError(res, error); }
}

// POST /api/friends/accept/:senderId  — accept a pending request
export async function acceptFriendRequest(req, res) {
    try {
        const row = await prisma.friendship.findFirst({
            where: { senderId: req.params.senderId, receiverId: req.user.id, status: "pending" },
        });
        if (!row) return res.status(404).json({ error: "Friend request not found" });
        const updated = await prisma.friendship.update({
            where: { id: row.id },
            data:  { status: "accepted" },
        });
        res.json({ message: "Friend request accepted", friendship: updated });
    } catch (error) { handleError(res, error); }
}

// DELETE /api/friends/:userId  — remove friend or decline request
export async function removeFriend(req, res) {
    try {
        const row = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId: req.user.id,       receiverId: req.params.userId },
                    { senderId: req.params.userId, receiverId: req.user.id },
                ],
            },
        });
        if (!row) return res.status(404).json({ error: "Friendship not found" });
        await prisma.friendship.delete({ where: { id: row.id } });
        res.json({ message: "Friend removed" });
    } catch (error) { handleError(res, error); }
}

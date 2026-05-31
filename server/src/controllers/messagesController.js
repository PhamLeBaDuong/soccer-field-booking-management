import prisma from "../db.cjs";

function handleError(res, error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
}

// GET /api/messages/:userId  — conversation thread between current user and another user
export async function getConversation(req, res) {
    const { userId } = req.params;
    try {
        const messages = await prisma.chatMessage.findMany({
            where: {
                OR: [
                    { senderId: req.user.id,  receiverId: userId },
                    { senderId: userId,        receiverId: req.user.id },
                ],
            },
            include: {
                sender:   { select: { id: true, name: true, username: true } },
                receiver: { select: { id: true, name: true, username: true } },
            },
            orderBy: { createdAt: "asc" },
        });

        // Mark unread messages sent to the current user as read
        await prisma.chatMessage.updateMany({
            where: { senderId: userId, receiverId: req.user.id, readAt: null },
            data:  { readAt: new Date() },
        });

        res.json(messages);
    } catch (error) { handleError(res, error); }
}

// POST /api/messages/:userId  — send a message to another user
export async function sendMessage(req, res) {
    const { userId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "content is required" });
    if (userId === req.user.id) return res.status(400).json({ error: "Cannot message yourself" });
    try {
        const message = await prisma.chatMessage.create({
            data: {
                senderId:   req.user.id,
                receiverId: userId,
                content:    content.trim(),
            },
            include: {
                sender:   { select: { id: true, name: true, username: true } },
                receiver: { select: { id: true, name: true, username: true } },
            },
        });
        res.status(201).json(message);
    } catch (error) { handleError(res, error); }
}

// GET /api/messages  — list recent conversations (one row per contact)
export async function getConversationList(req, res) {
    try {
        // Get the most recent message per conversation partner
        const sent     = await prisma.chatMessage.findMany({
            where:   { senderId: req.user.id },
            include: { receiver: { select: { id: true, name: true, username: true } } },
            orderBy: { createdAt: "desc" },
        });
        const received = await prisma.chatMessage.findMany({
            where:   { receiverId: req.user.id },
            include: { sender: { select: { id: true, name: true, username: true } } },
            orderBy: { createdAt: "desc" },
        });

        // Build map of partnerId → latest message + partner info
        const map = new Map();
        for (const m of sent) {
            const partnerId = m.receiverId;
            if (!map.has(partnerId)) map.set(partnerId, { partner: m.receiver, lastMessage: m, unreadCount: 0 });
        }
        for (const m of received) {
            const partnerId = m.senderId;
            const prev = map.get(partnerId);
            const isNewer = !prev || new Date(m.createdAt) > new Date(prev.lastMessage.createdAt);
            if (!prev) {
                map.set(partnerId, {
                    partner:      m.sender,
                    lastMessage:  m,
                    unreadCount:  m.readAt ? 0 : 1,
                });
            } else {
                if (isNewer) prev.lastMessage = m;
                if (!m.readAt) prev.unreadCount = (prev.unreadCount ?? 0) + 1;
            }
        }

        const conversations = Array.from(map.values()).sort(
            (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
        );
        res.json(conversations);
    } catch (error) { handleError(res, error); }
}

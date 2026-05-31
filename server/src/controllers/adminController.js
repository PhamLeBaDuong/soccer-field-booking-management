import prisma from "../db.cjs";
import dotenv from "dotenv";
dotenv.config();

// Get controller
export async function getAllComplexes(req, res) {
    try {
        const complexes = await prisma.complex.findMany();
        res.status(200).json(complexes);
    } catch (error) {
        console.error("Error fetching complexes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getAllFields(req, res) {
    try {
        const fields = await prisma.field.findMany();
        res.status(200).json(fields);
    } catch (error) {
        console.error("Error fetching fields:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getComplexById(req, res) {
    const { id } = req.params;

    try {
        const complex = await prisma.complex.findUnique({
            where: { id },
        });

        if (!complex) {
            return res.status(404).json({ error: "Complex not found" });
        }

        res.status(200).json(complex);
    } catch (error) {
        console.error("Error fetching complex:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function getFieldsByComplexId(req, res) {
    const { complexId } = req.params;

    try {
        const fields = await prisma.field.findMany({
            where: { complexId },
        });

        if (fields.length === 0) {
            return res.status(404).json({ error: "No fields found for this complex" });
        }

        res.status(200).json(fields);
    } catch (error) {
        console.error("Error fetching fields:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Add Controller

export async function addComplex(req, res) {
    const { ownerId, name, address, description } = req.body;

    if (!ownerId || !name || !address) {
        return res.status(400).json({ error: "Owner ID, Name, and Address are required" });
    }

    try {
        const newComplex = await prisma.complex.create({
            data: {
                name,
                address,
                desc: description || null,
                createdAt: new Date(),
                owner: {
                    connect: { id: ownerId },
                },
            },
        });
        res.status(201).json({ message: "Complex created successfully", complex: newComplex });
    } catch (error) {
        console.error("Error creating complex:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function addField(req, res) {
    const { complexId, name, type, startTime, endTime, indoor, lights, price } = req.body;
    if (!complexId || !name || !type || !startTime || !endTime) {
        return res.status(400).json({ error: "complexId, name, type, startTime and endTime are required" });
    }
    try {
        const newField = await prisma.field.create({
            data: {
                complexId,
                name,
                type,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                indoor: indoor ?? false,
                lights: lights ?? false,
                metadata: price != null ? { price } : undefined,
                createdAt: new Date(),
            },
        });
        res.status(201).json({ message: "Field created successfully", field: newField });
    } catch (error) {
        console.error("Error creating field:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update Controller

export async function updateComplex(req, res) {
    const { id } = req.params;
    const { name, address, description } = req.body;

    try {
        const updatedComplex = await prisma.complex.update({
            where: { id },
            data: {
                name,
                address,
                desc: description || null,
            },
        });
        res.status(200).json({ message: "Complex updated successfully", complex: updatedComplex });
    } catch (error) {
        console.error("Error updating complex:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function updateField(req, res) {
    const { id } = req.params;
    const { name, type, price, startTime, endTime, indoor, lights } = req.body;

    // Build update payload — price lives in metadata since the schema has no price column
    const data = {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
        ...(indoor !== undefined && { indoor }),
        ...(lights !== undefined && { lights }),
        ...(price !== undefined && { metadata: { price } }),
    };

    try {
        const updatedField = await prisma.field.update({
            where: { id },
            data,
        });
        res.status(200).json({ message: "Field updated successfully", field: updatedField });
    } catch (error) {
        console.error("Error updating field:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Delete Controller

export async function deleteComplex(req, res) {
    const { id } = req.params;

    try {
        await prisma.complex.delete({
            where: { id },
        });
        res.status(200).json({ message: "Complex deleted successfully" });
    } catch (error) {
        console.error("Error deleting complex:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function deleteField(req, res) {
    const { id } = req.params;

    try {
        await prisma.field.delete({
            where: { id },
        });
        res.status(200).json({ message: "Field deleted successfully" });
    } catch (error) {
        console.error("Error deleting field:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

// GET /api/admin/fields/:fieldId/schedule?date=YYYY-MM-DD
// Returns all confirmed bookings on a given UTC calendar day, with match details.
export async function getFieldSchedule(req, res) {
    const { fieldId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd   = new Date(`${date}T23:59:59.999Z`);

    try {
        // De-duplicate by matchId — one slot per match is enough for the timetable
        const bookings = await prisma.booking.findMany({
            where: {
                fieldId,
                status: { in: ["confirmed", "completed"] },
                startTime: { gte: dayStart, lte: dayEnd },
            },
            include: {
                user:  { select: { id: true, name: true, username: true } },
                match: {
                    include: {
                        matchPost: {
                            include: {
                                team: { select: { id: true, name: true, size: true } },
                            },
                        },
                        lobbies: {
                            select: { id: true, teamSize: true, initialSize: true, creatorId: true },
                        },
                    },
                },
            },
            orderBy: { startTime: "asc" },
            distinct: ["matchId"],
        });

        res.json(bookings);
    } catch (error) {
        console.error("Error fetching field schedule:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// ─── Match result ─────────────────────────────────────────────────────────────

// PUT /api/admin/matches/:matchId/result
export async function setMatchResult(req, res) {
    const { matchId } = req.params;
    const { homeScore, awayScore, resultNote } = req.body;

    if (homeScore === undefined || awayScore === undefined) {
        return res.status(400).json({ error: "homeScore and awayScore are required" });
    }

    try {
        const match = await prisma.match.update({
            where: { id: matchId },
            data: {
                homeScore:  Number(homeScore),
                awayScore:  Number(awayScore),
                resultNote: resultNote ?? null,
            },
        });
        res.json({ message: "Match result recorded", match });
    } catch (error) {
        console.error("Error setting match result:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
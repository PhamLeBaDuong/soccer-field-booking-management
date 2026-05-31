import prisma from "../db.cjs";

function handleError(res, error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not found") || msg.includes("required") || msg.includes("forbidden")) {
        return res.status(msg.includes("forbidden") ? 403 : 400).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

// ─── Complexes ────────────────────────────────────────────────────────────────

// GET /api/venues/complexes   — list the current user's complexes (with field count)
export async function getMyComplexes(req, res) {
    try {
        const complexes = await prisma.complex.findMany({
            where:   { ownerId: req.user.id },
            include: { fields: { select: { id: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json(complexes.map((c) => ({ ...c, fieldsCount: c.fields.length })));
    } catch (error) { handleError(res, error); }
}

// GET /api/venues/complexes/:id  — single complex (must own it)
export async function getMyComplex(req, res) {
    try {
        const complex = await prisma.complex.findUnique({
            where:   { id: req.params.id },
            include: { fields: true },
        });
        if (!complex) return res.status(404).json({ error: "Complex not found" });
        if (complex.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        res.json(complex);
    } catch (error) { handleError(res, error); }
}

// POST /api/venues/complexes
export async function createComplex(req, res) {
    const { name, address, description, lat, lng } = req.body;
    if (!name || !address) return res.status(400).json({ error: "name and address are required" });
    try {
        const complex = await prisma.complex.create({
            data: {
                name,
                address,
                desc:    description ?? null,
                lat:     lat    ?? null,
                lng:     lng    ?? null,
                ownerId: req.user.id,
            },
        });
        res.status(201).json({ message: "Complex created", complex });
    } catch (error) { handleError(res, error); }
}

// PUT /api/venues/complexes/:id
export async function updateComplex(req, res) {
    const { name, address, description, lat, lng } = req.body;
    try {
        const existing = await prisma.complex.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: "Complex not found" });
        if (existing.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        const complex = await prisma.complex.update({
            where: { id: req.params.id },
            data:  {
                ...(name        !== undefined && { name }),
                ...(address     !== undefined && { address }),
                ...(description !== undefined && { desc: description }),
                ...(lat         !== undefined && { lat }),
                ...(lng         !== undefined && { lng }),
            },
        });
        res.json({ message: "Complex updated", complex });
    } catch (error) { handleError(res, error); }
}

// DELETE /api/venues/complexes/:id
export async function deleteComplex(req, res) {
    try {
        const existing = await prisma.complex.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: "Complex not found" });
        if (existing.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        await prisma.complex.delete({ where: { id: req.params.id } });
        res.json({ message: "Complex deleted" });
    } catch (error) { handleError(res, error); }
}

// ─── Fields ───────────────────────────────────────────────────────────────────

// GET /api/venues/complexes/:complexId/fields
export async function getFieldsForComplex(req, res) {
    try {
        const complex = await prisma.complex.findUnique({ where: { id: req.params.complexId } });
        if (!complex) return res.status(404).json({ error: "Complex not found" });
        if (complex.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        const fields = await prisma.field.findMany({
            where:   { complexId: req.params.complexId },
            orderBy: { createdAt: "asc" },
        });
        res.json(fields);
    } catch (error) { handleError(res, error); }
}

// POST /api/venues/complexes/:complexId/fields
export async function createField(req, res) {
    const { name, type, startTime, endTime, indoor, lights, price, address, description } = req.body;
    if (!name || !type || !startTime || !endTime) {
        return res.status(400).json({ error: "name, type, startTime, and endTime are required" });
    }
    try {
        const complex = await prisma.complex.findUnique({ where: { id: req.params.complexId } });
        if (!complex) return res.status(404).json({ error: "Complex not found" });
        if (complex.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        const field = await prisma.field.create({
            data: {
                complexId:   req.params.complexId,
                ownerId:     req.user.id,
                name,
                type,
                startTime:   new Date(startTime),
                endTime:     new Date(endTime),
                indoor:      indoor  ?? false,
                lights:      lights  ?? false,
                pricePerHour: price  ?? 0,
                desc:        description ?? null,
                address:     address ?? complex.address ?? null,
            },
        });
        res.status(201).json({ message: "Field created", field });
    } catch (error) { handleError(res, error); }
}

// PUT /api/venues/fields/:id
export async function updateField(req, res) {
    const { name, type, startTime, endTime, indoor, lights, price, address, description } = req.body;
    try {
        const existing = await prisma.field.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: "Field not found" });
        if (existing.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        const field = await prisma.field.update({
            where: { id: req.params.id },
            data:  {
                ...(name        !== undefined && { name }),
                ...(type        !== undefined && { type }),
                ...(startTime   !== undefined && { startTime: new Date(startTime) }),
                ...(endTime     !== undefined && { endTime:   new Date(endTime) }),
                ...(indoor      !== undefined && { indoor }),
                ...(lights      !== undefined && { lights }),
                ...(price       !== undefined && { pricePerHour: price }),
                ...(address     !== undefined && { address }),
                ...(description !== undefined && { desc: description }),
            },
        });
        res.json({ message: "Field updated", field });
    } catch (error) { handleError(res, error); }
}

// DELETE /api/venues/fields/:id
export async function deleteField(req, res) {
    try {
        const existing = await prisma.field.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: "Field not found" });
        if (existing.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        await prisma.field.delete({ where: { id: req.params.id } });
        res.json({ message: "Field deleted" });
    } catch (error) { handleError(res, error); }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

// GET /api/venues/fields/:id/schedule?date=YYYY-MM-DD
// Returns bookings for the day — only if the caller owns this field.
export async function getVenueFieldSchedule(req, res) {
    const { id: fieldId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
    }

    try {
        const field = await prisma.field.findUnique({ where: { id: fieldId } });
        if (!field) return res.status(404).json({ error: "Field not found" });
        if (field.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd   = new Date(`${date}T23:59:59.999Z`);

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
                            include: { team: { select: { id: true, name: true, size: true } } },
                        },
                        lobbies: { select: { id: true, teamSize: true } },
                    },
                },
            },
            orderBy: { startTime: "asc" },
            distinct: ["matchId"],
        });

        res.json(bookings);
    } catch (error) { handleError(res, error); }
}

// GET /api/venues/complexes/:complexId/schedule?date=YYYY-MM-DD
// Returns every field in the complex with that day's bookings — for the grid view.
export async function getComplexSchedule(req, res) {
    const { complexId } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date query param (YYYY-MM-DD) is required" });
    }

    try {
        const complex = await prisma.complex.findUnique({ where: { id: complexId } });
        if (!complex) return res.status(404).json({ error: "Complex not found" });
        if (complex.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd   = new Date(`${date}T23:59:59.999Z`);

        const fields = await prisma.field.findMany({
            where:   { complexId },
            orderBy: { createdAt: "asc" },
            include: {
                bookings: {
                    where: {
                        status:    { in: ["confirmed", "completed"] },
                        startTime: { gte: dayStart, lte: dayEnd },
                    },
                    include: {
                        user:  { select: { id: true, name: true, username: true } },
                        match: {
                            include: {
                                matchPost: { include: { team: { select: { id: true, name: true, size: true } } } },
                                lobbies:   { select: { id: true, teamSize: true } },
                            },
                        },
                    },
                    orderBy:  { startTime: "asc" },
                    distinct: ["matchId"],
                },
            },
        });

        res.json({ complex: { id: complex.id, name: complex.name }, fields });
    } catch (error) { handleError(res, error); }
}

// ─── Manual booking ───────────────────────────────────────────────────────────

// POST /api/venues/fields/:id/manual-booking
// Creates a "walk-in" reservation by the field owner.
// Body: { date, startTime, endTime, customerName?, note? }
//   date      – "YYYY-MM-DD"
//   startTime – "HH:MM"
//   endTime   – "HH:MM"
export async function createManualBooking(req, res) {
    const { id: fieldId } = req.params;
    const { date, startTime, endTime, customerName, note } = req.body;

    if (!date || !startTime || !endTime) {
        return res.status(400).json({ error: "date, startTime, and endTime are required" });
    }

    try {
        const field = await prisma.field.findUnique({ where: { id: fieldId } });
        if (!field) return res.status(404).json({ error: "Field not found" });
        if (field.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

        const start = new Date(`${date}T${startTime}:00.000Z`);
        const end   = new Date(`${date}T${endTime}:00.000Z`);
        if (end <= start) return res.status(400).json({ error: "endTime must be after startTime" });

        // Check for conflicts
        const conflict = await prisma.booking.findFirst({
            where: {
                fieldId,
                status: "confirmed",
                AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
            },
        });
        if (conflict) return res.status(400).json({ error: "That slot is already booked" });

        const hours      = (end - start) / 3_600_000;
        const totalPrice = hours * (field.pricePerHour ?? 0);
        const label      = [customerName, note].filter(Boolean).join(" — ") || "Manual booking";

        // Create a synthetic match to satisfy the FK constraint
        const match = await prisma.match.create({
            data: {
                source:     "manual",
                status:     "confirmed",
                fieldId,
                startTime:  start,
                endTime:    end,
                resultNote: label,
            },
        });

        const booking = await prisma.booking.create({
            data: {
                userId:     req.user.id,
                fieldId,
                matchId:    match.id,
                startTime:  start,
                endTime:    end,
                totalPrice,
                currency:   "VND",
                status:     "confirmed",
            },
            include: { user: { select: { id: true, name: true } } },
        });

        res.status(201).json({ message: "Manual booking created", booking, match });
    } catch (error) { handleError(res, error); }
}

import prisma from "./src/db.cjs";

async function main() {
    console.log("🌱 Seeding database...");

    // ── Users ──────────────────────────────────────────────────────────────────
    const bcrypt = await import("bcrypt");

    const adminPass  = await bcrypt.default.hash("admin123",  10);
    const playerPass = await bcrypt.default.hash("player123", 10);

    const admin = await prisma.user.upsert({
        where:  { username: "admin" },
        update: {},
        create: { username: "admin",  password: adminPass,  name: "Demo Admin",    email: "admin@pitchbook.test",   role: "admin"  },
    });

    const player1 = await prisma.user.upsert({
        where:  { username: "duong99" },
        update: {},
        create: { username: "duong99", password: playerPass, name: "Duong Pham",   email: "duong@pitchbook.test",   role: "player" },
    });

    const player2 = await prisma.user.upsert({
        where:  { username: "khanh88" },
        update: {},
        create: { username: "khanh88", password: playerPass, name: "Khanh Nguyen", email: "khanh@pitchbook.test",   role: "player" },
    });

    const player3 = await prisma.user.upsert({
        where:  { username: "minh77" },
        update: {},
        create: { username: "minh77",  password: playerPass, name: "Minh Tran",    email: "minh@pitchbook.test",    role: "player" },
    });

    console.log("✅ Users created");

    // ── Complexes ──────────────────────────────────────────────────────────────
    const complexA = await prisma.complex.create({
        data: {
            name:    "Thủ Đức Sports Hub",
            address: "18 Võ Văn Ngân, Thủ Đức, TP.HCM",
            lat:     10.8503,
            lng:     106.7717,
            desc:    "Premium indoor & outdoor pitches in Thủ Đức",
            ownerId: admin.id,
        },
    });

    const complexB = await prisma.complex.create({
        data: {
            name:    "Quận 7 Arena",
            address: "45 Nguyễn Thị Thập, Quận 7, TP.HCM",
            lat:     10.7320,
            lng:     106.7218,
            desc:    "Modern complex near Phú Mỹ Hưng",
            ownerId: admin.id,
        },
    });

    const complexC = await prisma.complex.create({
        data: {
            name:    "Bình Thạnh FC Center",
            address: "120 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM",
            lat:     10.8017,
            lng:     106.7143,
            desc:    "Central location, easy parking",
            ownerId: admin.id,
        },
    });

    const complexD = await prisma.complex.create({
        data: {
            name:    "Gò Vấp Pitch Park",
            address: "88 Nguyễn Văn Lượng, Gò Vấp, TP.HCM",
            lat:     10.8382,
            lng:     106.6831,
            desc:    "Budget-friendly with 7v7 and 11v11 options",
            ownerId: admin.id,
        },
    });

    console.log("✅ Complexes created");

    // ── Operating hours helpers ────────────────────────────────────────────────
    const open  = new Date("2000-01-01T06:00:00Z");
    const close = new Date("2000-01-01T23:00:00Z");

    // ── Fields — Complex A (Thủ Đức) ──────────────────────────────────────────
    await prisma.field.createMany({
        data: [
            {
                complexId: complexA.id, ownerId: admin.id,
                name: "Sân A1 – 5v5 Indoor", type: "5v5",
                indoor: true, lights: true, pricePerHour: 200000,
                startTime: open, endTime: close,
                desc: "Full turf, air-conditioned",
            },
            {
                complexId: complexA.id, ownerId: admin.id,
                name: "Sân A2 – 5v5 Indoor", type: "5v5",
                indoor: true, lights: true, pricePerHour: 200000,
                startTime: open, endTime: close,
                desc: "Full turf, air-conditioned",
            },
            {
                complexId: complexA.id, ownerId: admin.id,
                name: "Sân A3 – 7v7 Outdoor", type: "7v7",
                indoor: false, lights: true, pricePerHour: 300000,
                startTime: open, endTime: close,
                desc: "Natural grass, floodlit",
            },
            {
                complexId: complexA.id, ownerId: admin.id,
                name: "Sân A4 – 11v11 Outdoor", type: "11v11",
                indoor: false, lights: true, pricePerHour: 500000,
                startTime: open, endTime: close,
                desc: "Full-size pitch, FIFA-standard turf",
            },
        ],
    });

    // ── Fields — Complex B (Quận 7) ───────────────────────────────────────────
    await prisma.field.createMany({
        data: [
            {
                complexId: complexB.id, ownerId: admin.id,
                name: "Sân B1 – 5v5", type: "5v5",
                indoor: false, lights: true, pricePerHour: 180000,
                startTime: open, endTime: close,
                desc: "Synthetic turf, covered roof",
            },
            {
                complexId: complexB.id, ownerId: admin.id,
                name: "Sân B2 – 5v5", type: "5v5",
                indoor: false, lights: true, pricePerHour: 180000,
                startTime: open, endTime: close,
                desc: "Synthetic turf, covered roof",
            },
            {
                complexId: complexB.id, ownerId: admin.id,
                name: "Sân B3 – 7v7", type: "7v7",
                indoor: false, lights: true, pricePerHour: 280000,
                startTime: open, endTime: close,
                desc: "Natural grass",
            },
            {
                complexId: complexB.id, ownerId: admin.id,
                name: "Sân B4 – 7v7 VIP", type: "7v7",
                indoor: true, lights: true, pricePerHour: 400000,
                startTime: open, endTime: close,
                desc: "Indoor VIP pitch with lounge access",
            },
        ],
    });

    // ── Fields — Complex C (Bình Thạnh) ───────────────────────────────────────
    await prisma.field.createMany({
        data: [
            {
                complexId: complexC.id, ownerId: admin.id,
                name: "Sân C1 – 5v5", type: "5v5",
                indoor: false, lights: true, pricePerHour: 150000,
                startTime: open, endTime: close,
                desc: "Affordable, central location",
            },
            {
                complexId: complexC.id, ownerId: admin.id,
                name: "Sân C2 – 5v5", type: "5v5",
                indoor: false, lights: false, pricePerHour: 120000,
                startTime: open, endTime: new Date("2000-01-01T20:00:00Z"),
                desc: "Daytime only, no lights",
            },
            {
                complexId: complexC.id, ownerId: admin.id,
                name: "Sân C3 – 7v7", type: "7v7",
                indoor: false, lights: true, pricePerHour: 250000,
                startTime: open, endTime: close,
                desc: "Synthetic grass, night games available",
            },
        ],
    });

    // ── Fields — Complex D (Gò Vấp) ───────────────────────────────────────────
    await prisma.field.createMany({
        data: [
            {
                complexId: complexD.id, ownerId: admin.id,
                name: "Sân D1 – 5v5", type: "5v5",
                indoor: false, lights: true, pricePerHour: 130000,
                startTime: open, endTime: close,
                desc: "Budget pitch, well maintained",
            },
            {
                complexId: complexD.id, ownerId: admin.id,
                name: "Sân D2 – 7v7", type: "7v7",
                indoor: false, lights: true, pricePerHour: 220000,
                startTime: open, endTime: close,
                desc: "Synthetic turf",
            },
            {
                complexId: complexD.id, ownerId: admin.id,
                name: "Sân D3 – 11v11", type: "11v11",
                indoor: false, lights: false, pricePerHour: 400000,
                startTime: open, endTime: new Date("2000-01-01T19:00:00Z"),
                desc: "Full-size, daytime only",
            },
            {
                complexId: complexD.id, ownerId: admin.id,
                name: "Sân D4 – 5v5 Indoor", type: "5v5",
                indoor: true, lights: true, pricePerHour: 170000,
                startTime: open, endTime: close,
                desc: "Indoor turf with changing rooms",
            },
        ],
    });

    console.log("✅ Fields created");

    // ── Summary ────────────────────────────────────────────────────────────────
    const counts = {
        users:     await prisma.user.count(),
        complexes: await prisma.complex.count(),
        fields:    await prisma.field.count(),
    };
    console.log("\n📊 Database summary:", counts);
    console.log("\n🔑 Test accounts:");
    console.log("   admin   / admin123  (role: admin)");
    console.log("   duong99 / player123 (role: player)");
    console.log("   khanh88 / player123 (role: player)");
    console.log("   minh77  / player123 (role: player)");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());

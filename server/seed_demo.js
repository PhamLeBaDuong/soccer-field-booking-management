import prisma from "./src/db.cjs";

// Safety guard: this script wipes every table before reseeding. Never let it
// run against a production database.
if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to run seed against production database (NODE_ENV=production).");
  process.exit(1);
}

const daysAgo  = (n, h = 18, m = 0) => new Date(Date.UTC(2026, 4, 31 - n, h, m, 0));
const daysFrom = (n, h = 18, m = 0) => new Date(Date.UTC(2026, 4, 31 + n, h, m, 0));

async function main() {
  console.log("🌱 Seeding demo database...");
  const bcrypt = await import("bcrypt");
  const adminPass  = await bcrypt.default.hash("admin123",  10);
  const playerPass = await bcrypt.default.hash("player123", 10);

  // ── Clear ─────────────────────────────────────────────────────────────────
  console.log("🗑️  Clearing existing data...");
  await prisma.teamInvite.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.friendship.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.lobbySlot.deleteMany({});
  await prisma.lobby.updateMany({ data: { matchId: null } });
  await prisma.lobby.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.matchPost.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.field.deleteMany({});
  await prisma.complex.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✅ Cleared");

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log("👥 Creating users...");
  const [
    admin, duong99, khanh88, minh77,
    hung55, tuan44, linh33, hoa22, son11, bao99,
    long88, dat77, quang66, thai55,
    nam44, phuc33, tung22, cuong11,
    manh99, hieu88, phuong77, duc66,
  ] = await Promise.all([
    prisma.user.create({ data: { username: "admin",    password: adminPass,  name: "Demo Admin",     email: "admin@pitchbook.test",    role: "admin"  } }),
    prisma.user.create({ data: { username: "duong99",  password: playerPass, name: "Duong Pham",     email: "duong@pitchbook.test",    role: "player" } }),
    prisma.user.create({ data: { username: "khanh88",  password: playerPass, name: "Khanh Nguyen",   email: "khanh@pitchbook.test",    role: "player" } }),
    prisma.user.create({ data: { username: "minh77",   password: playerPass, name: "Minh Tran",      email: "minh@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "hung55",   password: playerPass, name: "Hung Le",        email: "hung@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "tuan44",   password: playerPass, name: "Tuan Nguyen",    email: "tuan@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "linh33",   password: playerPass, name: "Linh Tran",      email: "linh@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "hoa22",    password: playerPass, name: "Hoa Pham",       email: "hoa@pitchbook.test",      role: "player" } }),
    prisma.user.create({ data: { username: "son11",    password: playerPass, name: "Son Dao",        email: "son@pitchbook.test",      role: "player" } }),
    prisma.user.create({ data: { username: "bao99",    password: playerPass, name: "Bao Vo",         email: "bao@pitchbook.test",      role: "player" } }),
    prisma.user.create({ data: { username: "long88",   password: playerPass, name: "Long Nguyen",    email: "long@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "dat77",    password: playerPass, name: "Dat Tran",       email: "dat@pitchbook.test",      role: "player" } }),
    prisma.user.create({ data: { username: "quang66",  password: playerPass, name: "Quang Le",       email: "quang@pitchbook.test",    role: "player" } }),
    prisma.user.create({ data: { username: "thai55",   password: playerPass, name: "Thai Pham",      email: "thai@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "nam44",    password: playerPass, name: "Nam Nguyen",     email: "nam@pitchbook.test",      role: "player" } }),
    prisma.user.create({ data: { username: "phuc33",   password: playerPass, name: "Phuc Vo",        email: "phuc@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "tung22",   password: playerPass, name: "Tung Tran",      email: "tung@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "cuong11",  password: playerPass, name: "Cuong Do",       email: "cuong@pitchbook.test",    role: "player" } }),
    prisma.user.create({ data: { username: "manh99",   password: playerPass, name: "Manh Nguyen",    email: "manh@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "hieu88",   password: playerPass, name: "Hieu Le",        email: "hieu@pitchbook.test",     role: "player" } }),
    prisma.user.create({ data: { username: "phuong77", password: playerPass, name: "Phuong Tran",    email: "phuong@pitchbook.test",   role: "player" } }),
    prisma.user.create({ data: { username: "duc66",    password: playerPass, name: "Duc Pham",       email: "duc@pitchbook.test",      role: "player" } }),
  ]);
  console.log("✅ 22 users");

  // ── Complexes ─────────────────────────────────────────────────────────────
  console.log("🏟️  Creating complexes...");
  const [complexA, complexB, complexC, complexD, complexE, complexF, complexG, complexH, complexI, complexJ] = await Promise.all([
    prisma.complex.create({ data: { name: "Thủ Đức Sports Hub",   address: "18 Võ Văn Ngân, Thủ Đức, TP.HCM",           lat: 10.8503, lng: 106.7717, desc: "Premium indoor & outdoor pitches in Thủ Đức",      ownerId: admin.id   } }),
    prisma.complex.create({ data: { name: "Quận 7 Arena",          address: "45 Nguyễn Thị Thập, Quận 7, TP.HCM",         lat: 10.7320, lng: 106.7218, desc: "Modern complex near Phú Mỹ Hưng",                 ownerId: admin.id   } }),
    prisma.complex.create({ data: { name: "Bình Thạnh FC Center",  address: "120 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM",    lat: 10.8017, lng: 106.7143, desc: "Central location, easy parking",                   ownerId: admin.id   } }),
    prisma.complex.create({ data: { name: "Gò Vấp Pitch Park",     address: "88 Nguyễn Văn Lượng, Gò Vấp, TP.HCM",        lat: 10.8382, lng: 106.6831, desc: "Budget-friendly with 7v7 and 11v11 options",       ownerId: admin.id   } }),
    prisma.complex.create({ data: { name: "Tân Bình Stadium",      address: "55 Cộng Hòa, Tân Bình, TP.HCM",              lat: 10.8017, lng: 106.6614, desc: "Well-lit stadium complex in the heart of Tân Bình", ownerId: hung55.id  } }),
    prisma.complex.create({ data: { name: "Phú Nhuận FC",          address: "12 Phan Đình Phùng, Phú Nhuận, TP.HCM",      lat: 10.7998, lng: 106.6821, desc: "Intimate 5v5 complex with changing rooms",          ownerId: tuan44.id  } }),
    prisma.complex.create({ data: { name: "Quận 1 Arena",          address: "78 Nguyễn Huệ, Quận 1, TP.HCM",              lat: 10.7769, lng: 106.7009, desc: "Premium fields in the CBD",                         ownerId: linh33.id  } }),
    prisma.complex.create({ data: { name: "Nhà Bè Sports Center",  address: "34 Huỳnh Tấn Phát, Nhà Bè, TP.HCM",          lat: 10.6962, lng: 106.7192, desc: "Large outdoor complex with natural grass",           ownerId: hoa22.id   } }),
    prisma.complex.create({ data: { name: "Quận 9 Field Club",     address: "200 Nguyễn Xiển, Quận 9, TP.HCM",             lat: 10.8514, lng: 106.7797, desc: "Spacious grounds in District 9",                    ownerId: son11.id   } }),
    prisma.complex.create({ data: { name: "Tân Phú Pitches",       address: "66 Tân Kỳ Tân Quý, Tân Phú, TP.HCM",         lat: 10.7949, lng: 106.6243, desc: "Affordable rates, multiple field sizes",             ownerId: bao99.id   } }),
  ]);
  console.log("✅ 10 complexes");

  // ── Fields ────────────────────────────────────────────────────────────────
  console.log("⚽ Creating fields...");
  const open  = new Date("2000-01-01T06:00:00Z");
  const close = new Date("2000-01-01T23:00:00Z");
  const close20 = new Date("2000-01-01T20:00:00Z");
  const close19 = new Date("2000-01-01T19:00:00Z");

  const [
    fieldA1, fieldA2, fieldA3, fieldA4,
    fieldB1, fieldB2, fieldB3, fieldB4,
    fieldC1, fieldC2, fieldC3,
    fieldD1, fieldD2, fieldD3, fieldD4,
    fieldE1, fieldE2, fieldE3,
    fieldF1, fieldF2,
    fieldG1, fieldG2,
    fieldH1, fieldH2, fieldH3,
    fieldI1, fieldI2,
    fieldJ1, fieldJ2, fieldJ3,
  ] = await Promise.all([
    // A – Thủ Đức (admin)
    prisma.field.create({ data: { complexId: complexA.id, ownerId: admin.id, name: "Sân A1 – 5v5 Indoor",   type: "5v5",   indoor: true,  lights: true,  pricePerHour: 200000, startTime: open, endTime: close,   desc: "Full turf, air-conditioned" } }),
    prisma.field.create({ data: { complexId: complexA.id, ownerId: admin.id, name: "Sân A2 – 5v5 Indoor",   type: "5v5",   indoor: true,  lights: true,  pricePerHour: 200000, startTime: open, endTime: close,   desc: "Full turf, air-conditioned" } }),
    prisma.field.create({ data: { complexId: complexA.id, ownerId: admin.id, name: "Sân A3 – 7v7 Outdoor",  type: "7v7",   indoor: false, lights: true,  pricePerHour: 300000, startTime: open, endTime: close,   desc: "Natural grass, floodlit" } }),
    prisma.field.create({ data: { complexId: complexA.id, ownerId: admin.id, name: "Sân A4 – 11v11 Outdoor",type: "11v11", indoor: false, lights: true,  pricePerHour: 500000, startTime: open, endTime: close,   desc: "Full-size pitch, FIFA-standard turf" } }),
    // B – Quận 7 (admin)
    prisma.field.create({ data: { complexId: complexB.id, ownerId: admin.id, name: "Sân B1 – 5v5",          type: "5v5",   indoor: false, lights: true,  pricePerHour: 180000, startTime: open, endTime: close,   desc: "Synthetic turf, covered roof" } }),
    prisma.field.create({ data: { complexId: complexB.id, ownerId: admin.id, name: "Sân B2 – 5v5",          type: "5v5",   indoor: false, lights: true,  pricePerHour: 180000, startTime: open, endTime: close,   desc: "Synthetic turf, covered roof" } }),
    prisma.field.create({ data: { complexId: complexB.id, ownerId: admin.id, name: "Sân B3 – 7v7",          type: "7v7",   indoor: false, lights: true,  pricePerHour: 280000, startTime: open, endTime: close,   desc: "Natural grass" } }),
    prisma.field.create({ data: { complexId: complexB.id, ownerId: admin.id, name: "Sân B4 – 7v7 VIP",      type: "7v7",   indoor: true,  lights: true,  pricePerHour: 400000, startTime: open, endTime: close,   desc: "Indoor VIP pitch with lounge access" } }),
    // C – Bình Thạnh (admin)
    prisma.field.create({ data: { complexId: complexC.id, ownerId: admin.id, name: "Sân C1 – 5v5",          type: "5v5",   indoor: false, lights: true,  pricePerHour: 150000, startTime: open, endTime: close,   desc: "Affordable, central location" } }),
    prisma.field.create({ data: { complexId: complexC.id, ownerId: admin.id, name: "Sân C2 – 5v5",          type: "5v5",   indoor: false, lights: false, pricePerHour: 120000, startTime: open, endTime: close20, desc: "Daytime only, no lights" } }),
    prisma.field.create({ data: { complexId: complexC.id, ownerId: admin.id, name: "Sân C3 – 7v7",          type: "7v7",   indoor: false, lights: true,  pricePerHour: 250000, startTime: open, endTime: close,   desc: "Synthetic grass, night games available" } }),
    // D – Gò Vấp (admin)
    prisma.field.create({ data: { complexId: complexD.id, ownerId: admin.id, name: "Sân D1 – 5v5",          type: "5v5",   indoor: false, lights: true,  pricePerHour: 130000, startTime: open, endTime: close,   desc: "Budget pitch, well maintained" } }),
    prisma.field.create({ data: { complexId: complexD.id, ownerId: admin.id, name: "Sân D2 – 7v7",          type: "7v7",   indoor: false, lights: true,  pricePerHour: 220000, startTime: open, endTime: close,   desc: "Synthetic turf" } }),
    prisma.field.create({ data: { complexId: complexD.id, ownerId: admin.id, name: "Sân D3 – 11v11",        type: "11v11", indoor: false, lights: false, pricePerHour: 400000, startTime: open, endTime: close19, desc: "Full-size, daytime only" } }),
    prisma.field.create({ data: { complexId: complexD.id, ownerId: admin.id, name: "Sân D4 – 5v5 Indoor",   type: "5v5",   indoor: true,  lights: true,  pricePerHour: 170000, startTime: open, endTime: close,   desc: "Indoor turf with changing rooms" } }),
    // E – Tân Bình (hung55)
    prisma.field.create({ data: { complexId: complexE.id, ownerId: hung55.id, name: "Sân E1 – 5v5",         type: "5v5",   indoor: false, lights: true,  pricePerHour: 160000, startTime: open, endTime: close,   desc: "Well-maintained synthetic turf" } }),
    prisma.field.create({ data: { complexId: complexE.id, ownerId: hung55.id, name: "Sân E2 – 7v7",         type: "7v7",   indoor: false, lights: true,  pricePerHour: 270000, startTime: open, endTime: close,   desc: "Floodlit grass pitch" } }),
    prisma.field.create({ data: { complexId: complexE.id, ownerId: hung55.id, name: "Sân E3 – 5v5 Indoor",  type: "5v5",   indoor: true,  lights: true,  pricePerHour: 210000, startTime: open, endTime: close,   desc: "AC indoor turf" } }),
    // F – Phú Nhuận (tuan44)
    prisma.field.create({ data: { complexId: complexF.id, ownerId: tuan44.id, name: "Sân F1 – 5v5",         type: "5v5",   indoor: false, lights: true,  pricePerHour: 155000, startTime: open, endTime: close,   desc: "Community field with seating" } }),
    prisma.field.create({ data: { complexId: complexF.id, ownerId: tuan44.id, name: "Sân F2 – 5v5 Indoor",  type: "5v5",   indoor: true,  lights: true,  pricePerHour: 195000, startTime: open, endTime: close,   desc: "Indoor with ventilation" } }),
    // G – Quận 1 (linh33)
    prisma.field.create({ data: { complexId: complexG.id, ownerId: linh33.id, name: "Sân G1 – 5v5 Premium", type: "5v5",   indoor: true,  lights: true,  pricePerHour: 350000, startTime: open, endTime: close,   desc: "Premium CBD indoor field" } }),
    prisma.field.create({ data: { complexId: complexG.id, ownerId: linh33.id, name: "Sân G2 – 7v7 Premium", type: "7v7",   indoor: true,  lights: true,  pricePerHour: 500000, startTime: open, endTime: close,   desc: "VIP match center, rooftop" } }),
    // H – Nhà Bè (hoa22)
    prisma.field.create({ data: { complexId: complexH.id, ownerId: hoa22.id, name: "Sân H1 – 5v5",          type: "5v5",   indoor: false, lights: true,  pricePerHour: 140000, startTime: open, endTime: close,   desc: "Natural grass, riverside" } }),
    prisma.field.create({ data: { complexId: complexH.id, ownerId: hoa22.id, name: "Sân H2 – 7v7",          type: "7v7",   indoor: false, lights: true,  pricePerHour: 240000, startTime: open, endTime: close,   desc: "Synthetic grass" } }),
    prisma.field.create({ data: { complexId: complexH.id, ownerId: hoa22.id, name: "Sân H3 – 11v11",        type: "11v11", indoor: false, lights: false, pricePerHour: 450000, startTime: open, endTime: close19, desc: "Standard grass pitch, daytime" } }),
    // I – Quận 9 (son11)
    prisma.field.create({ data: { complexId: complexI.id, ownerId: son11.id, name: "Sân I1 – 7v7",           type: "7v7",   indoor: false, lights: true,  pricePerHour: 230000, startTime: open, endTime: close,   desc: "Synthetic turf, spectator stands" } }),
    prisma.field.create({ data: { complexId: complexI.id, ownerId: son11.id, name: "Sân I2 – 11v11",         type: "11v11", indoor: false, lights: true,  pricePerHour: 480000, startTime: open, endTime: close,   desc: "Full-size pitch, scoreboard" } }),
    // J – Tân Phú (bao99)
    prisma.field.create({ data: { complexId: complexJ.id, ownerId: bao99.id, name: "Sân J1 – 5v5",           type: "5v5",   indoor: false, lights: true,  pricePerHour: 125000, startTime: open, endTime: close,   desc: "Budget-friendly, good condition" } }),
    prisma.field.create({ data: { complexId: complexJ.id, ownerId: bao99.id, name: "Sân J2 – 5v5 Indoor",    type: "5v5",   indoor: true,  lights: true,  pricePerHour: 165000, startTime: open, endTime: close,   desc: "Covered with fans" } }),
    prisma.field.create({ data: { complexId: complexJ.id, ownerId: bao99.id, name: "Sân J3 – 7v7",           type: "7v7",   indoor: false, lights: true,  pricePerHour: 210000, startTime: open, endTime: close,   desc: "Turf pitch, night games ok" } }),
  ]);
  console.log("✅ 30 fields");

  // ── Friendships ───────────────────────────────────────────────────────────
  console.log("🤝 Creating friendships...");
  const accepted = (a, b) => prisma.friendship.create({ data: { senderId: a, receiverId: b, status: "accepted" } });
  const pending  = (a, b) => prisma.friendship.create({ data: { senderId: a, receiverId: b, status: "pending"  } });
  await Promise.all([
    // admin ↔ everyone
    accepted(admin.id, duong99.id),  accepted(admin.id, khanh88.id),  accepted(admin.id, minh77.id),
    accepted(admin.id, hung55.id),   accepted(admin.id, tuan44.id),   accepted(admin.id, linh33.id),
    accepted(admin.id, hoa22.id),    accepted(admin.id, son11.id),    accepted(admin.id, bao99.id),
    accepted(admin.id, long88.id),   accepted(admin.id, dat77.id),    accepted(admin.id, quang66.id),
    // duong99's circle
    accepted(duong99.id, khanh88.id), accepted(duong99.id, minh77.id), accepted(duong99.id, long88.id),
    accepted(duong99.id, dat77.id),   accepted(duong99.id, quang66.id),accepted(duong99.id, thai55.id),
    accepted(duong99.id, hung55.id),  accepted(duong99.id, bao99.id),
    // khanh88's circle
    accepted(khanh88.id, minh77.id),  accepted(khanh88.id, nam44.id),  accepted(khanh88.id, phuc33.id),
    accepted(khanh88.id, tung22.id),  accepted(khanh88.id, linh33.id),
    // minh77's circle
    accepted(minh77.id, cuong11.id),  accepted(minh77.id, manh99.id),  accepted(minh77.id, hieu88.id),
    accepted(minh77.id, hoa22.id),    accepted(minh77.id, son11.id),
    // hung55's circle
    accepted(hung55.id, son11.id),    accepted(hung55.id, bao99.id),   accepted(hung55.id, phuong77.id),
    accepted(hung55.id, duc66.id),    accepted(hung55.id, tuan44.id),
    // tuan44's circle
    accepted(tuan44.id, linh33.id),   accepted(tuan44.id, hoa22.id),   accepted(tuan44.id, thai55.id),
    // linh33's circle
    accepted(linh33.id, quang66.id),  accepted(linh33.id, nam44.id),   accepted(linh33.id, phuc33.id),
    // hoa22's circle
    accepted(hoa22.id, cuong11.id),   accepted(hoa22.id, manh99.id),
    // son11's circle
    accepted(son11.id, bao99.id),     accepted(son11.id, hieu88.id),   accepted(son11.id, phuong77.id),
    // bao99's circle
    accepted(bao99.id, duc66.id),     accepted(bao99.id, dat77.id),
    // player cross-links
    accepted(long88.id, dat77.id),    accepted(long88.id, quang66.id),
    accepted(nam44.id, phuc33.id),    accepted(nam44.id, tung22.id),
    accepted(cuong11.id, manh99.id),  accepted(hieu88.id, phuong77.id), accepted(phuong77.id, duc66.id),
    accepted(dat77.id, thai55.id),    accepted(thai55.id, quang66.id),
    // pending requests
    pending(quang66.id, khanh88.id),
    pending(tung22.id, hung55.id),
    pending(duc66.id, duong99.id),
  ]);
  console.log("✅ Friendships created");

  // ── Teams + Members ───────────────────────────────────────────────────────
  console.log("👕 Creating teams...");
  const [warriors, sharks, binhThanhFC, saiGonStars, phuNhuanFC, nhaBeUnited, q9Dragons, tanPhuTigers, districtFalcons] = await Promise.all([
    prisma.team.create({ data: { name: "Thủ Đức Warriors",  size: 5, rating: 4.2, leaderId: duong99.id } }),
    prisma.team.create({ data: { name: "Q7 Sharks",          size: 5, rating: 3.8, leaderId: khanh88.id } }),
    prisma.team.create({ data: { name: "Bình Thạnh FC",      size: 7, rating: 4.5, leaderId: minh77.id  } }),
    prisma.team.create({ data: { name: "Saigon Stars",       size: 5, rating: 3.6, leaderId: hung55.id  } }),
    prisma.team.create({ data: { name: "Phú Nhuận FC",       size: 5, rating: 4.0, leaderId: tuan44.id  } }),
    prisma.team.create({ data: { name: "Nhà Bè United",      size: 5, rating: 3.5, leaderId: hoa22.id   } }),
    prisma.team.create({ data: { name: "Q9 Dragons",         size: 7, rating: 4.1, leaderId: son11.id   } }),
    prisma.team.create({ data: { name: "Tân Phú Tigers",     size: 5, rating: 3.9, leaderId: bao99.id   } }),
    prisma.team.create({ data: { name: "District Falcons",   size: 7, rating: 4.3, leaderId: linh33.id  } }),
  ]);
  await prisma.teamMember.createMany({ data: [
    // Warriors (5v5)
    { teamId: warriors.id,        userId: duong99.id  },
    { teamId: warriors.id,        userId: long88.id   },
    { teamId: warriors.id,        userId: dat77.id    },
    { teamId: warriors.id,        userId: quang66.id  },
    { teamId: warriors.id,        userId: thai55.id   },
    // Sharks (5v5)
    { teamId: sharks.id,          userId: khanh88.id  },
    { teamId: sharks.id,          userId: nam44.id    },
    { teamId: sharks.id,          userId: phuc33.id   },
    { teamId: sharks.id,          userId: tung22.id   },
    { teamId: sharks.id,          userId: cuong11.id  },
    // Bình Thạnh FC (7v7)
    { teamId: binhThanhFC.id,     userId: minh77.id   },
    { teamId: binhThanhFC.id,     userId: manh99.id   },
    { teamId: binhThanhFC.id,     userId: hieu88.id   },
    { teamId: binhThanhFC.id,     userId: phuong77.id },
    { teamId: binhThanhFC.id,     userId: duc66.id    },
    { teamId: binhThanhFC.id,     userId: long88.id   },
    { teamId: binhThanhFC.id,     userId: dat77.id    },
    // Saigon Stars (5v5)
    { teamId: saiGonStars.id,     userId: hung55.id   },
    { teamId: saiGonStars.id,     userId: son11.id    },
    { teamId: saiGonStars.id,     userId: bao99.id    },
    { teamId: saiGonStars.id,     userId: tuan44.id   },
    { teamId: saiGonStars.id,     userId: linh33.id   },
    // Phú Nhuận FC (5v5)
    { teamId: phuNhuanFC.id,      userId: tuan44.id   },
    { teamId: phuNhuanFC.id,      userId: hoa22.id    },
    { teamId: phuNhuanFC.id,      userId: thai55.id   },
    { teamId: phuNhuanFC.id,      userId: quang66.id  },
    { teamId: phuNhuanFC.id,      userId: phuc33.id   },
    // Nhà Bè United (5v5)
    { teamId: nhaBeUnited.id,     userId: hoa22.id    },
    { teamId: nhaBeUnited.id,     userId: cuong11.id  },
    { teamId: nhaBeUnited.id,     userId: long88.id   },
    { teamId: nhaBeUnited.id,     userId: dat77.id    },
    { teamId: nhaBeUnited.id,     userId: nam44.id    },
    // Q9 Dragons (7v7)
    { teamId: q9Dragons.id,       userId: son11.id    },
    { teamId: q9Dragons.id,       userId: minh77.id   },
    { teamId: q9Dragons.id,       userId: hieu88.id   },
    { teamId: q9Dragons.id,       userId: phuong77.id },
    { teamId: q9Dragons.id,       userId: duc66.id    },
    { teamId: q9Dragons.id,       userId: manh99.id   },
    { teamId: q9Dragons.id,       userId: tung22.id   },
    // Tân Phú Tigers (5v5)
    { teamId: tanPhuTigers.id,    userId: bao99.id    },
    { teamId: tanPhuTigers.id,    userId: duong99.id  },
    { teamId: tanPhuTigers.id,    userId: hung55.id   },
    { teamId: tanPhuTigers.id,    userId: nam44.id    },
    { teamId: tanPhuTigers.id,    userId: phuc33.id   },
    // District Falcons (7v7)
    { teamId: districtFalcons.id, userId: linh33.id   },
    { teamId: districtFalcons.id, userId: khanh88.id  },
    { teamId: districtFalcons.id, userId: minh77.id   },
    { teamId: districtFalcons.id, userId: quang66.id  },
    { teamId: districtFalcons.id, userId: nam44.id    },
    { teamId: districtFalcons.id, userId: phuc33.id   },
    { teamId: districtFalcons.id, userId: tung22.id   },
  ]});
  console.log("✅ 9 teams");

  // ── Past matches via MatchPost ─────────────────────────────────────────────
  console.log("📅 Creating past matches (post-based)...");

  // M1: Warriors vs Sharks — 5v5, fieldA1, 5 days ago, 3-2
  const post1 = await prisma.matchPost.create({ data: { teamId: warriors.id, fieldId: fieldA1.id, preferredStartTime: daysAgo(5), preferredEndTime: daysAgo(5, 19), status: "matched", note: "Warriors looking for a 5v5 challenge" } });
  const match1 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldA1.id, startTime: daysAgo(5), endTime: daysAgo(5, 19), homeScore: 3, awayScore: 2, matchPostId: post1.id } });
  await prisma.booking.createMany({ data: [duong99, long88, dat77, quang66, thai55, khanh88, nam44, phuc33, tung22, cuong11].map(u => ({ userId: u.id, fieldId: fieldA1.id, matchId: match1.id, startTime: daysAgo(5), endTime: daysAgo(5, 19), totalPrice: 200000, currency: "VND", status: "confirmed" })) });

  // M2: Bình Thạnh FC vs Saigon Stars — 7v7, fieldB3, 12 days ago, 2-1
  const post2 = await prisma.matchPost.create({ data: { teamId: binhThanhFC.id, fieldId: fieldB3.id, preferredStartTime: daysAgo(12, 19), preferredEndTime: daysAgo(12, 20, 30), status: "matched", note: "7v7 match challenge" } });
  const match2 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldB3.id, startTime: daysAgo(12, 19), endTime: daysAgo(12, 20, 30), homeScore: 2, awayScore: 1, matchPostId: post2.id } });
  await prisma.booking.createMany({ data: [minh77, manh99, hieu88, phuong77, duc66, long88, dat77, hung55, son11, bao99, tuan44, linh33, quang66, thai55].map(u => ({ userId: u.id, fieldId: fieldB3.id, matchId: match2.id, startTime: daysAgo(12, 19), endTime: daysAgo(12, 20, 30), totalPrice: 280000, currency: "VND", status: "confirmed" })) });

  // M3: Q9 Dragons vs District Falcons — 7v7, fieldD2, 8 days ago, 1-3
  const post3 = await prisma.matchPost.create({ data: { teamId: q9Dragons.id, fieldId: fieldD2.id, preferredStartTime: daysAgo(8, 17), preferredEndTime: daysAgo(8, 18, 30), status: "matched", note: "Q9 looking for a worthy 7v7 challenge" } });
  const match3 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldD2.id, startTime: daysAgo(8, 17), endTime: daysAgo(8, 18, 30), homeScore: 1, awayScore: 3, matchPostId: post3.id } });
  await prisma.booking.createMany({ data: [son11, minh77, hieu88, phuong77, duc66, manh99, tung22, linh33, khanh88, quang66, nam44, phuc33, dat77, thai55].map(u => ({ userId: u.id, fieldId: fieldD2.id, matchId: match3.id, startTime: daysAgo(8, 17), endTime: daysAgo(8, 18, 30), totalPrice: 220000, currency: "VND", status: "confirmed" })) });

  // M4: Phú Nhuận FC vs Tân Phú Tigers — 5v5, fieldE1, 3 days ago, 2-2
  const post4 = await prisma.matchPost.create({ data: { teamId: phuNhuanFC.id, fieldId: fieldE1.id, preferredStartTime: daysAgo(3, 19), preferredEndTime: daysAgo(3, 20), status: "matched", note: "Phú Nhuận vs Tân Phú derby!" } });
  const match4 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldE1.id, startTime: daysAgo(3, 19), endTime: daysAgo(3, 20), homeScore: 2, awayScore: 2, matchPostId: post4.id } });
  await prisma.booking.createMany({ data: [tuan44, hoa22, thai55, quang66, phuc33, bao99, duong99, hung55, nam44, tung22].map(u => ({ userId: u.id, fieldId: fieldE1.id, matchId: match4.id, startTime: daysAgo(3, 19), endTime: daysAgo(3, 20), totalPrice: 160000, currency: "VND", status: "confirmed" })) });

  // M5: Saigon Stars vs Nhà Bè United — 5v5, fieldJ1, 18 days ago, 4-1
  const post5 = await prisma.matchPost.create({ data: { teamId: saiGonStars.id, fieldId: fieldJ1.id, preferredStartTime: daysAgo(18, 18), preferredEndTime: daysAgo(18, 19), status: "matched", note: "Saigon Stars open challenge" } });
  const match5 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldJ1.id, startTime: daysAgo(18, 18), endTime: daysAgo(18, 19), homeScore: 4, awayScore: 1, matchPostId: post5.id } });
  await prisma.booking.createMany({ data: [hung55, son11, bao99, tuan44, linh33, hoa22, cuong11, long88, dat77, nam44].map(u => ({ userId: u.id, fieldId: fieldJ1.id, matchId: match5.id, startTime: daysAgo(18, 18), endTime: daysAgo(18, 19), totalPrice: 125000, currency: "VND", status: "confirmed" })) });

  console.log("✅ 5 past post-based matches");

  // ── Past matches via Lobby ────────────────────────────────────────────────
  console.log("🎲 Creating past lobby-based matches...");

  // M6: 5v5 fieldC1, 6 days ago, 2-0
  const match6 = await prisma.match.create({ data: { source: "lobby", status: "confirmed", fieldId: fieldC1.id, startTime: daysAgo(6, 17), endTime: daysAgo(6, 18), homeScore: 2, awayScore: 0 } });
  const lb6A = await prisma.lobby.create({ data: { fieldId: fieldC1.id, startTime: daysAgo(6, 17), endTime: daysAgo(6, 18), teamSize: 5, creatorId: duong99.id, status: "matched", matchId: match6.id } });
  const lb6B = await prisma.lobby.create({ data: { fieldId: fieldC1.id, startTime: daysAgo(6, 17), endTime: daysAgo(6, 18), teamSize: 5, creatorId: khanh88.id, status: "matched", matchId: match6.id } });
  const lb6APlayers = [duong99, long88, dat77, hung55, son11];
  const lb6BPlayers = [khanh88, minh77, tuan44, linh33, hoa22];
  await prisma.lobbySlot.createMany({ data: [...lb6APlayers.map(u => ({ lobbyId: lb6A.id, userId: u.id })), ...lb6BPlayers.map(u => ({ lobbyId: lb6B.id, userId: u.id }))] });
  await prisma.booking.createMany({ data: [...lb6APlayers, ...lb6BPlayers].map(u => ({ userId: u.id, fieldId: fieldC1.id, matchId: match6.id, startTime: daysAgo(6, 17), endTime: daysAgo(6, 18), totalPrice: 150000, currency: "VND", status: "confirmed" })) });

  // M7: 5v5 fieldF1, 15 days ago, 1-3
  const match7 = await prisma.match.create({ data: { source: "lobby", status: "confirmed", fieldId: fieldF1.id, startTime: daysAgo(15, 18), endTime: daysAgo(15, 19), homeScore: 1, awayScore: 3 } });
  const lb7A = await prisma.lobby.create({ data: { fieldId: fieldF1.id, startTime: daysAgo(15, 18), endTime: daysAgo(15, 19), teamSize: 5, creatorId: bao99.id, status: "matched", matchId: match7.id } });
  const lb7B = await prisma.lobby.create({ data: { fieldId: fieldF1.id, startTime: daysAgo(15, 18), endTime: daysAgo(15, 19), teamSize: 5, creatorId: phuong77.id, status: "matched", matchId: match7.id } });
  const lb7APlayers = [bao99, duc66, manh99, quang66, thai55];
  const lb7BPlayers = [phuong77, hieu88, cuong11, phuc33, nam44];
  await prisma.lobbySlot.createMany({ data: [...lb7APlayers.map(u => ({ lobbyId: lb7A.id, userId: u.id })), ...lb7BPlayers.map(u => ({ lobbyId: lb7B.id, userId: u.id }))] });
  await prisma.booking.createMany({ data: [...lb7APlayers, ...lb7BPlayers].map(u => ({ userId: u.id, fieldId: fieldF1.id, matchId: match7.id, startTime: daysAgo(15, 18), endTime: daysAgo(15, 19), totalPrice: 155000, currency: "VND", status: "confirmed" })) });

  // M8: 7v7 fieldH2, 20 days ago, 3-2
  const match8 = await prisma.match.create({ data: { source: "lobby", status: "confirmed", fieldId: fieldH2.id, startTime: daysAgo(20, 16), endTime: daysAgo(20, 17, 30), homeScore: 3, awayScore: 2 } });
  const lb8A = await prisma.lobby.create({ data: { fieldId: fieldH2.id, startTime: daysAgo(20, 16), endTime: daysAgo(20, 17, 30), teamSize: 7, creatorId: minh77.id, status: "matched", matchId: match8.id } });
  const lb8B = await prisma.lobby.create({ data: { fieldId: fieldH2.id, startTime: daysAgo(20, 16), endTime: daysAgo(20, 17, 30), teamSize: 7, creatorId: son11.id,  status: "matched", matchId: match8.id } });
  const lb8APlayers = [minh77, manh99, hieu88, phuong77, duc66, long88, dat77];
  const lb8BPlayers = [son11, hung55, bao99, tuan44, linh33, quang66, thai55];
  await prisma.lobbySlot.createMany({ data: [...lb8APlayers.map(u => ({ lobbyId: lb8A.id, userId: u.id })), ...lb8BPlayers.map(u => ({ lobbyId: lb8B.id, userId: u.id }))] });
  await prisma.booking.createMany({ data: [...lb8APlayers, ...lb8BPlayers].map(u => ({ userId: u.id, fieldId: fieldH2.id, matchId: match8.id, startTime: daysAgo(20, 16), endTime: daysAgo(20, 17, 30), totalPrice: 240000, currency: "VND", status: "confirmed" })) });

  console.log("✅ 3 past lobby-based matches");

  // ── Upcoming confirmed matches ────────────────────────────────────────────
  console.log("📅 Creating upcoming matches...");

  // M9: Warriors vs Nhà Bè United — 5v5, fieldA1, tomorrow
  const post9 = await prisma.matchPost.create({ data: { teamId: warriors.id, fieldId: fieldA1.id, preferredStartTime: daysFrom(1, 18), preferredEndTime: daysFrom(1, 19), status: "matched", note: "Warriors warm-up before the season" } });
  const match9 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldA1.id, startTime: daysFrom(1, 18), endTime: daysFrom(1, 19), matchPostId: post9.id } });
  await prisma.booking.createMany({ data: [duong99, long88, dat77, quang66, thai55, hoa22, cuong11, manh99, hieu88, phuong77].map(u => ({ userId: u.id, fieldId: fieldA1.id, matchId: match9.id, startTime: daysFrom(1, 18), endTime: daysFrom(1, 19), totalPrice: 200000, currency: "VND", status: "confirmed" })) });

  // M10: Saigon Stars vs District Falcons — 7v7, fieldB3, 3 days from now
  const post10 = await prisma.matchPost.create({ data: { teamId: saiGonStars.id, fieldId: fieldB3.id, preferredStartTime: daysFrom(3, 19), preferredEndTime: daysFrom(3, 20, 30), status: "matched", note: "Big derby match" } });
  const match10 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldB3.id, startTime: daysFrom(3, 19), endTime: daysFrom(3, 20, 30), matchPostId: post10.id } });
  await prisma.booking.createMany({ data: [hung55, son11, bao99, tuan44, linh33, hoa22, cuong11, khanh88, minh77, nam44, phuc33, tung22, dat77, hieu88].map(u => ({ userId: u.id, fieldId: fieldB3.id, matchId: match10.id, startTime: daysFrom(3, 19), endTime: daysFrom(3, 20, 30), totalPrice: 280000, currency: "VND", status: "confirmed" })) });

  // M11: Lobby match — 5v5, fieldJ1, 5 days from now
  const match11 = await prisma.match.create({ data: { source: "lobby", status: "confirmed", fieldId: fieldJ1.id, startTime: daysFrom(5, 17), endTime: daysFrom(5, 18) } });
  const lb11A = await prisma.lobby.create({ data: { fieldId: fieldJ1.id, startTime: daysFrom(5, 17), endTime: daysFrom(5, 18), teamSize: 5, creatorId: duong99.id, status: "matched", matchId: match11.id } });
  const lb11B = await prisma.lobby.create({ data: { fieldId: fieldJ1.id, startTime: daysFrom(5, 17), endTime: daysFrom(5, 18), teamSize: 5, creatorId: bao99.id,   status: "matched", matchId: match11.id } });
  const lb11APlayers = [duong99, long88, dat77, quang66, thai55];
  const lb11BPlayers = [bao99, duc66, manh99, tuan44, linh33];
  await prisma.lobbySlot.createMany({ data: [...lb11APlayers.map(u => ({ lobbyId: lb11A.id, userId: u.id })), ...lb11BPlayers.map(u => ({ lobbyId: lb11B.id, userId: u.id }))] });
  await prisma.booking.createMany({ data: [...lb11APlayers, ...lb11BPlayers].map(u => ({ userId: u.id, fieldId: fieldJ1.id, matchId: match11.id, startTime: daysFrom(5, 17), endTime: daysFrom(5, 18), totalPrice: 125000, currency: "VND", status: "confirmed" })) });

  // M12: Q9 Dragons vs Phú Nhuận FC — 7v7, fieldI1, 8 days from now
  const post12 = await prisma.matchPost.create({ data: { teamId: q9Dragons.id, fieldId: fieldI1.id, preferredStartTime: daysFrom(8, 18), preferredEndTime: daysFrom(8, 19, 30), status: "matched", note: "Q9 home ground match" } });
  const match12 = await prisma.match.create({ data: { source: "post", status: "confirmed", fieldId: fieldI1.id, startTime: daysFrom(8, 18), endTime: daysFrom(8, 19, 30), matchPostId: post12.id } });
  await prisma.booking.createMany({ data: [son11, minh77, hieu88, phuong77, duc66, manh99, tung22, tuan44, hoa22, thai55, quang66, phuc33, nam44, cuong11].map(u => ({ userId: u.id, fieldId: fieldI1.id, matchId: match12.id, startTime: daysFrom(8, 18), endTime: daysFrom(8, 19, 30), totalPrice: 230000, currency: "VND", status: "confirmed" })) });

  console.log("✅ 4 upcoming confirmed matches");

  // ── Open MatchPosts ───────────────────────────────────────────────────────
  console.log("📋 Creating open match posts...");
  await prisma.matchPost.createMany({ data: [
    { teamId: sharks.id,          fieldId: fieldB1.id, preferredStartTime: daysFrom(2, 18), preferredEndTime: daysFrom(2, 19),      status: "open", visibility: "public",  note: "Q7 Sharks open challenge – 5v5, bring your best!" },
    { teamId: binhThanhFC.id,     fieldId: fieldC3.id, preferredStartTime: daysFrom(4, 19), preferredEndTime: daysFrom(4, 20, 30), status: "open", visibility: "public",  note: "Bình Thạnh FC looking for a strong 7v7 team" },
    { teamId: q9Dragons.id,                            preferredStartTime: daysFrom(6, 18), preferredEndTime: daysFrom(6, 19, 30), status: "open", visibility: "public",  note: "Q9 Dragons – open to any field nearby, flexible location", lat: 10.8514, lng: 106.7797 },
    { teamId: tanPhuTigers.id,    fieldId: fieldJ1.id, preferredStartTime: daysFrom(7, 17), preferredEndTime: daysFrom(7, 18),      status: "open", visibility: "public",  note: "Looking for a casual weekend 5v5" },
    { teamId: districtFalcons.id, fieldId: fieldG2.id, preferredStartTime: daysFrom(9, 20), preferredEndTime: daysFrom(9, 21, 30), status: "open", visibility: "private", note: "Private 7v7 invite-only event", code: "FALCON7" },
    { teamId: nhaBeUnited.id,     fieldId: fieldH1.id, preferredStartTime: daysFrom(11, 18),preferredEndTime: daysFrom(11, 19),     status: "open", visibility: "public",  note: "Nhà Bè United seeks 5v5 match – friendly vibes" },
    { teamId: warriors.id,        fieldId: fieldA3.id, preferredStartTime: daysFrom(14, 19),preferredEndTime: daysFrom(14, 20, 30),status: "open", visibility: "public",  note: "Warriors seeking 7v7 on the grass – no mercy!" },
  ]});
  console.log("✅ 7 open match posts");

  // ── Open Lobbies ──────────────────────────────────────────────────────────
  console.log("🚪 Creating open lobbies...");

  const lobA = await prisma.lobby.create({ data: { fieldId: fieldA2.id, startTime: daysFrom(2, 18), endTime: daysFrom(2, 19),     teamSize: 5, creatorId: minh77.id,   status: "open", visibility: "public" } });
  await prisma.lobbySlot.createMany({ data: [minh77, manh99, hieu88].map(u => ({ lobbyId: lobA.id, userId: u.id })) });

  const lobB = await prisma.lobby.create({ data: { fieldId: fieldD4.id, startTime: daysFrom(3, 17), endTime: daysFrom(3, 18),     teamSize: 5, creatorId: tuan44.id,  status: "open", visibility: "public" } });
  await prisma.lobbySlot.createMany({ data: [tuan44, linh33].map(u => ({ lobbyId: lobB.id, userId: u.id })) });

  const lobC = await prisma.lobby.create({ data: { fieldId: fieldE1.id, startTime: daysFrom(4, 19), endTime: daysFrom(4, 20),     teamSize: 5, creatorId: son11.id,   status: "open", visibility: "public" } });
  await prisma.lobbySlot.createMany({ data: [son11, bao99, hung55, duc66].map(u => ({ lobbyId: lobC.id, userId: u.id })) });

  const lobD = await prisma.lobby.create({ data: { fieldId: fieldB2.id, startTime: daysFrom(5, 20), endTime: daysFrom(5, 21),     teamSize: 5, creatorId: phuong77.id,status: "open", visibility: "public" } });
  await prisma.lobbySlot.createMany({ data: [phuong77].map(u => ({ lobbyId: lobD.id, userId: u.id })) });

  const lobE = await prisma.lobby.create({ data: { fieldId: fieldG1.id, startTime: daysFrom(6, 18), endTime: daysFrom(6, 19),     teamSize: 5, creatorId: linh33.id,  status: "open", visibility: "private", code: "VIP2026" } });
  await prisma.lobbySlot.createMany({ data: [linh33, khanh88].map(u => ({ lobbyId: lobE.id, userId: u.id })) });

  const lobF = await prisma.lobby.create({ data: { fieldId: fieldH2.id, startTime: daysFrom(7, 17), endTime: daysFrom(7, 18, 30), teamSize: 7, creatorId: hoa22.id,   status: "open", visibility: "public" } });
  await prisma.lobbySlot.createMany({ data: [hoa22, cuong11, long88].map(u => ({ lobbyId: lobF.id, userId: u.id })) });

  const lobG = await prisma.lobby.create({ data: { fieldId: fieldJ3.id, startTime: daysFrom(10, 18), endTime: daysFrom(10, 19),   teamSize: 7, creatorId: dat77.id,   status: "open", visibility: "public" } });
  await prisma.lobbySlot.createMany({ data: [dat77, thai55, quang66, nam44, phuc33].map(u => ({ lobbyId: lobG.id, userId: u.id })) });

  console.log("✅ 7 open lobbies");

  // ── Summary ───────────────────────────────────────────────────────────────
  const counts = {
    users:       await prisma.user.count(),
    complexes:   await prisma.complex.count(),
    fields:      await prisma.field.count(),
    teams:       await prisma.team.count(),
    matches:     await prisma.match.count(),
    bookings:    await prisma.booking.count(),
    lobbies:     await prisma.lobby.count(),
    matchPosts:  await prisma.matchPost.count(),
    friendships: await prisma.friendship.count(),
  };
  console.log("\n📊 Database summary:", counts);
  console.log("\n🔑 Accounts (all players: player123 | admin: admin123):");
  console.log("   admin     – admin, owns 4 complexes (A–D)");
  console.log("   duong99   – leads Warriors, in Tân Phú Tigers");
  console.log("   khanh88   – leads Q7 Sharks, in District Falcons");
  console.log("   minh77    – leads Bình Thạnh FC, in Q9 Dragons + District Falcons");
  console.log("   hung55    – leads Saigon Stars, owns Tân Bình complex");
  console.log("   tuan44    – leads Phú Nhuận FC, owns Phú Nhuận complex");
  console.log("   linh33    – leads District Falcons, owns Quận 1 complex");
  console.log("   hoa22     – leads Nhà Bè United, owns Nhà Bè complex");
  console.log("   son11     – leads Q9 Dragons, owns Quận 9 complex");
  console.log("   bao99     – leads Tân Phú Tigers, owns Tân Phú complex");
  console.log("   long88..duc66 – regular players");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

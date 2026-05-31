// Seed script: fix admin role + add friend relationships for testing
// Run: node seed_social.cjs

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Fix Demo Admin role
  const admin = await prisma.user.update({
    where: { username: "admin" },
    data:  { role: "admin" },
  });
  console.log(`✅ Set ${admin.name} (${admin.username}) role → admin`);

  // 2. Create accepted friendships between Demo Admin and all other users
  const others = await prisma.user.findMany({
    where: { username: { not: "admin" } },
    select: { id: true, name: true, username: true },
  });

  for (const u of others) {
    await prisma.friendship.upsert({
      where: {
        senderId_receiverId: { senderId: admin.id, receiverId: u.id },
      },
      create: {
        senderId:   admin.id,
        receiverId: u.id,
        status:     "accepted",
      },
      update: { status: "accepted" },
    });
    console.log(`✅ Friends: ${admin.name} ↔ ${u.name} (${u.username})`);
  }

  // 3. Seed a few pending friend requests TO admin for testing the Requests tab
  if (others.length >= 2) {
    await prisma.friendship.upsert({
      where: {
        senderId_receiverId: { senderId: others[0].id, receiverId: admin.id },
      },
      create: {
        senderId:   others[0].id,
        receiverId: admin.id,
        status:     "pending",
      },
      update: { status: "pending" },
    });
    console.log(`✅ Pending request from ${others[0].name} → ${admin.name}`);
  }

  console.log("\n🎉 Done!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e.message); process.exit(1); });

import { db } from "@/lib/db";

async function main() {
  console.log("🌱 Seeding database...");

  // Create test user
  const user = await db.user.upsert({
    where: { email: "demo@lastminutes.com" },
    update: {},
    create: {
      email: "demo@lastminutes.com",
      name: "Demo User",
      role: "USER",
      emailVerified: true,
    },
  });

  // Create subscription
  await db.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      monthlyLimit: 1000,
    },
  });

  // Create usage record
  await db.usage.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      monthlyDictationMins: 120,
      totalDictationMins: 500,
    },
  });

  console.log("✅ Seeding complete");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

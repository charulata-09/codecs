import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding started...");

  // 1. Create standard SaaS plans
  const plans = [
    {
      name: "Free",
      description: "Basic features for individuals and side projects.",
      price: 0.0,
      interval: "month",
      stripePriceId: "price_free_mock",
      features: {
        apiCallsLimit: 1000,
        seatsLimit: 1,
        storageLimitGb: 5,
        analyticsEnabled: false,
        prioritySupport: false,
      },
    },
    {
      name: "Pro",
      description: "Perfect for growing startups and professional developers.",
      price: 29.0,
      interval: "month",
      stripePriceId: "price_pro_mock", // Swap this out with your Stripe Pro Price ID in production
      features: {
        apiCallsLimit: 50000,
        seatsLimit: 5,
        storageLimitGb: 50,
        analyticsEnabled: true,
        prioritySupport: true,
      },
    },
    {
      name: "Enterprise",
      description: "Robust security and features for large organizations.",
      price: 199.0,
      interval: "month",
      stripePriceId: "price_enterprise_mock", // Swap this out with your Stripe Enterprise Price ID in production
      features: {
        apiCallsLimit: 1000000,
        seatsLimit: 999,
        storageLimitGb: 1000,
        analyticsEnabled: true,
        prioritySupport: true,
      },
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({
      where: { name: plan.name },
    });
    if (!existing) {
      await prisma.plan.create({
        data: plan,
      });
      console.log(`Created plan: ${plan.name}`);
    } else {
      console.log(`Plan already exists: ${plan.name}`);
    }
  }

  // 2. Create default organization
  let adminOrg = await prisma.organization.findFirst({
    where: { name: "Admin Headquarters" },
  });

  if (!adminOrg) {
    adminOrg = await prisma.organization.create({
      data: {
        name: "Admin Headquarters",
      },
    });
    console.log("Created Admin Headquarters Organization");
  }

  // 3. Create default Super Admin user
  const adminEmail = "admin@saas.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        organizationId: adminOrg.id,
      },
    });
    console.log(`Created Super Admin user: ${adminEmail} (password: admin123)`);
  } else {
    console.log(`Super Admin user already exists: ${adminEmail}`);
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

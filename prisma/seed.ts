import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.position.deleteMany();
  await prisma.bond.deleteMany();

  // Sample Argentine ONs
  await prisma.bond.create({
    data: {
      ticker: "YPF2026",
      issuer: "YPF S.A.",
      currency: "USD",
      couponRate: 0.085,
      couponFrequency: 2,
      firstCouponDate: new Date("2024-01-15"),
      maturityDate: new Date("2026-07-15"),
      amortizationType: "bullet",
    },
  });

  await prisma.bond.create({
    data: {
      ticker: "PAMP2027",
      issuer: "Pampa Energía",
      currency: "USD",
      couponRate: 0.075,
      couponFrequency: 2,
      firstCouponDate: new Date("2024-06-15"),
      maturityDate: new Date("2027-12-15"),
      amortizationType: "bullet",
    },
  });

  await prisma.bond.create({
    data: {
      ticker: "IRSA2028",
      issuer: "IRSA Inversiones",
      currency: "USD",
      couponRate: 0.07,
      couponFrequency: 2,
      firstCouponDate: new Date("2024-03-01"),
      maturityDate: new Date("2028-09-01"),
      amortizationType: "equal",
      amortStartDate: new Date("2027-03-01"),
      amortPayments: 4,
    },
  });

  await prisma.bond.create({
    data: {
      ticker: "VIST2029",
      issuer: "Vista Energy",
      currency: "USD",
      couponRate: 0.065,
      couponFrequency: 2,
      firstCouponDate: new Date("2024-04-15"),
      maturityDate: new Date("2029-10-15"),
      amortizationType: "custom",
      customAmortSchedule: JSON.stringify([
        { date: "2028-04-15", pct: 33.33 },
        { date: "2028-10-15", pct: 33.33 },
        { date: "2029-04-15", pct: 33.34 },
      ]),
    },
  });

  console.log("Seed completed: 4 sample bonds created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

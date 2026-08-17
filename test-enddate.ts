import { prisma } from "./lib/prisma";

async function run() {
  const startDate = undefined;
  const endDate = "2026-07-16";

  const where: any = {};
  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  console.log("Where clause:", where);
  const movs = await prisma.stockMovement.findMany({ where, orderBy: { date: "desc" } });
  console.log("Found:", movs.length);
  console.log(movs.map(m => m.date));
}
run();

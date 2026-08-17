import { prisma } from "./lib/prisma";

async function main() {
  try {
    const movements = await prisma.productStockMovement.findMany({
      where: {},
      orderBy: { date: "desc" },
      skip: 0,
      take: 20,
      include: {
        product: true,
        productionRecord: true,
        // @ts-ignore
        invalidRelation: true,
      },
    });
    console.log("Success", movements.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

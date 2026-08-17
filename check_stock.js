const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stockMovements = await prisma.stockMovement.findMany({
    orderBy: { date: 'desc' },
    take: 5,
    include: { rawMaterial: true }
  });
  console.log("Stock Movements:", JSON.stringify(stockMovements, null, 2));

  const pMovements = await prisma.productStockMovement.findMany({
    orderBy: { date: 'desc' },
    take: 5,
    include: { product: true }
  });
  console.log("Product Stock Movements:", JSON.stringify(pMovements, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

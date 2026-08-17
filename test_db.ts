import { prisma } from "./lib/prisma";

async function main() {
  const products = await prisma.product.findMany();
  const rawMaterials = await prisma.rawMaterial.findMany();
  console.log("Products:", products.length);
  console.log("RawMaterials:", rawMaterials.length);
}

main().finally(() => prisma.$disconnect());

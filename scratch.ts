import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
    include: {
      recipes: {
        include: {
          rawMaterial: true,
          componentProduct: true,
        },
      },
    },
  });
  console.log("Found products:", products.length);
  try {
    JSON.stringify(products);
    console.log("Stringify products: SUCCESS");
  } catch (e) {
    console.error("Stringify products: ERROR", e);
  }

  const rm = await prisma.rawMaterial.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });
  console.log("Found raw materials:", rm.length);
  try {
    JSON.stringify(rm);
    console.log("Stringify RM: SUCCESS");
  } catch (e) {
    console.error("Stringify RM: ERROR", e);
  }
}
run();

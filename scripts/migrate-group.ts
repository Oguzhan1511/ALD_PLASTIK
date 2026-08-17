import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration...');

  // 1. Find the target ShipmentGroup
  const group = await prisma.shipmentGroup.findFirst({
    where: {
      OR: [
        { code: '640104Z03' },
        { name: { contains: 'Yıkama Grubu Rose' } }
      ]
    },
    include: {
      items: true
    }
  });

  if (!group) {
    console.log('Shipment group not found! Maybe already migrated?');
    return;
  }

  console.log(`Found group: ${group.name} with ${group.items.length} items`);

  // 2. Check if product already exists
  let product = await prisma.product.findFirst({
    where: { code: '640104Z03' }
  });

  if (!product) {
    console.log('Creating new product...');
    product = await prisma.product.create({
      data: {
        name: 'Yıkama Grubu Rose (Kutulu)',
        code: '640104Z03',
        currentStock: 0,
      }
    });
    console.log(`Created product: ${product.id}`);
  } else {
    console.log(`Product already exists: ${product.id}`);
  }

  // 3. Create recipes for items
  console.log('Migrating components to recipes...');
  for (const item of group.items) {
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        productId: product.id,
        componentProductId: item.productId
      }
    });

    if (!existingRecipe) {
      await prisma.recipe.create({
        data: {
          productId: product.id,
          componentProductId: item.productId,
          quantityPerUnit: item.quantityPerUnit,
          wastePercentage: 0
        }
      });
      console.log(`Created recipe for component product ID: ${item.productId}`);
    } else {
      console.log(`Recipe already exists for component product ID: ${item.productId}`);
    }
  }

  // 4. Mark group as deleted so it doesn't show up in any legacy queries
  await prisma.shipmentGroup.update({
    where: { id: group.id },
    data: { isDeleted: true }
  });

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

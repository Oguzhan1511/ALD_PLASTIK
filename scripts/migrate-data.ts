import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // 1. Raw Materials
  const rawMaterialsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../raw_materials.json'), 'utf-8'));
  console.log(`Found ${rawMaterialsData.length} raw materials to migrate.`);
  
  const formattedRawMaterials = rawMaterialsData.map((item: any) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    unit: item.unit,
    currentStock: item.currentStock,
    criticalLevel: item.criticalLevel,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    isDeleted: item.isDeleted === 1,
  }));
  
  await prisma.rawMaterial.createMany({
    data: formattedRawMaterials,
    skipDuplicates: true,
  });
  console.log('Raw materials migrated.');

  // 2. Products
  const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf-8'));
  console.log(`Found ${productsData.length} products to migrate.`);
  
  const formattedProducts = productsData.map((item: any) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    parentProduct: item.parentProduct,
    unitWeight: item.unitWeight,
    currentStock: item.currentStock,
    criticalLevel: item.criticalLevel,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    isDeleted: item.isDeleted === 1,
  }));
  
  await prisma.product.createMany({
    data: formattedProducts,
    skipDuplicates: true,
  });
  console.log('Products migrated.');

  // 3. Recipes
  const recipesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../recipes.json'), 'utf-8'));
  console.log(`Found ${recipesData.length} recipes to migrate.`);
  
  const formattedRecipes = recipesData.map((item: any) => ({
    id: item.id,
    productId: item.productId,
    rawMaterialId: item.rawMaterialId,
    componentProductId: item.componentProductId,
    quantityPerUnit: item.quantityPerUnit,
    wastePercentage: item.wastePercentage,
    createdAt: new Date(item.createdAt),
  }));
  
  await prisma.recipe.createMany({
    data: formattedRecipes,
    skipDuplicates: true,
  });
  console.log('Recipes migrated.');

  console.log('Data migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

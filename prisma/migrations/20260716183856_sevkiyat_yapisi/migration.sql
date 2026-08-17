/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `raw_materials` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "raw_materials" ADD COLUMN "code" TEXT;

-- CreateTable
CREATE TABLE "product_stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "productionRecordId" TEXT,
    "shipmentRecordId" TEXT,
    CONSTRAINT "product_stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_stock_movements_productionRecordId_fkey" FOREIGN KEY ("productionRecordId") REFERENCES "production_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "product_stock_movements_shipmentRecordId_fkey" FOREIGN KEY ("shipmentRecordId") REFERENCES "shipment_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipment_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "shipment_group_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentGroupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityPerUnit" DECIMAL NOT NULL,
    CONSTRAINT "shipment_group_items_shipmentGroupId_fkey" FOREIGN KEY ("shipmentGroupId") REFERENCES "shipment_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shipment_group_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipment_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "productId" TEXT,
    "shipmentGroupId" TEXT,
    "quantity" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    CONSTRAINT "shipment_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shipment_records_shipmentGroupId_fkey" FOREIGN KEY ("shipmentGroupId") REFERENCES "shipment_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentProduct" TEXT,
    "unitWeight" DECIMAL,
    "currentStock" DECIMAL NOT NULL DEFAULT 0,
    "criticalLevel" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("createdAt", "id", "name", "unitWeight", "updatedAt") SELECT "createdAt", "id", "name", "unitWeight", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
CREATE TABLE "new_recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "rawMaterialId" TEXT,
    "componentProductId" TEXT,
    "quantityPerUnit" DECIMAL NOT NULL DEFAULT 0,
    "wastePercentage" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recipes_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "recipes_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_recipes" ("createdAt", "id", "productId", "quantityPerUnit", "rawMaterialId") SELECT "createdAt", "id", "productId", "quantityPerUnit", "rawMaterialId" FROM "recipes";
DROP TABLE "recipes";
ALTER TABLE "new_recipes" RENAME TO "recipes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "shipment_groups_code_key" ON "shipment_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_groups_name_key" ON "shipment_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_group_items_shipmentGroupId_productId_key" ON "shipment_group_items"("shipmentGroupId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "raw_materials_code_key" ON "raw_materials"("code");

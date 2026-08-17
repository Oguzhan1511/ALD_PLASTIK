-- CreateTable
CREATE TABLE "pending_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "rejectionReason" TEXT,
    "productionRecordId" TEXT,
    "shipmentRecordId" TEXT,
    CONSTRAINT "pending_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pending_entries_productionRecordId_fkey" FOREIGN KEY ("productionRecordId") REFERENCES "production_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pending_entries_shipmentRecordId_fkey" FOREIGN KEY ("shipmentRecordId") REFERENCES "shipment_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

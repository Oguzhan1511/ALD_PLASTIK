import { prisma } from "./lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

async function runTest() {
  try {
    console.log("1. Creating dummy products with some stock...");
    const p1 = await prisma.product.create({
      data: { name: "Test Product 1", currentStock: 100 },
    });
    const p2 = await prisma.product.create({
      data: { name: "Test Product 2", currentStock: 50 },
    });
    console.log("Products created:", p1.id, p2.id);

    console.log("2. Creating shipment group...");
    const group = await prisma.shipmentGroup.create({
      data: { name: "Test Group", code: "TG-01" },
    });
    console.log("Group created:", group.id);

    console.log("3. Adding products to shipment group...");
    await prisma.shipmentGroupItem.create({
      data: { shipmentGroupId: group.id, productId: p1.id, quantityPerUnit: new Decimal("10") },
    });
    await prisma.shipmentGroupItem.create({
      data: { shipmentGroupId: group.id, productId: p2.id, quantityPerUnit: new Decimal("5") },
    });
    console.log("Items added.");

    // Fetch group
    const fetchedGroup = await prisma.shipmentGroup.findUnique({
      where: { id: group.id },
      include: { items: { include: { product: true } } },
    });

    const runShipment = async (quantity: number) => {
      // ÖN KONTROL
      const stockErrors: string[] = [];
      for (const item of fetchedGroup!.items) {
        const required = new Decimal(item.quantityPerUnit).mul(quantity);
        const available = new Decimal(item.product.currentStock);
        if (available.lessThan(required)) {
          stockErrors.push(`Yetersiz stok: ${item.product.name} — Gereken: ${required.toNumber()}, Mevcut: ${available.toNumber()}`);
        }
      }
      if (stockErrors.length > 0) throw new Error(stockErrors.join("\n"));

      // TRANSACTION
      return await prisma.$transaction(async (tx) => {
        const shipmentRecord = await tx.shipmentRecord.create({
          data: { type: "GRUP", shipmentGroupId: group.id, quantity, date: new Date() },
        });

        for (const item of fetchedGroup!.items) {
          const deductAmount = new Decimal(item.quantityPerUnit).mul(quantity);
          const updateResult = await tx.product.updateMany({
            where: { id: item.productId, currentStock: { gte: deductAmount.toNumber() } },
            data: { currentStock: { decrement: deductAmount.toNumber() } },
          });

          if (updateResult.count === 0) {
            throw new Error(`Yetersiz stok: ${item.product.name} — işlem sırasında stok değişti, lütfen tekrar deneyin.`);
          }
          await tx.productStockMovement.create({
            data: {
              productId: item.productId,
              type: "SEVKIYAT_CIKISI",
              quantity: -deductAmount.toNumber(),
              date: new Date(),
              shipmentRecordId: shipmentRecord.id,
            },
          });
        }
        return shipmentRecord;
      });
    };

    console.log("4. Simulating successful shipment (Quantity: 2)");
    await runShipment(2);
    const checkP1 = await prisma.product.findUnique({ where: { id: p1.id } });
    const checkP2 = await prisma.product.findUnique({ where: { id: p2.id } });
    console.log(`P1 stock: ${checkP1?.currentStock} (Expected: 80)`);
    console.log(`P2 stock: ${checkP2?.currentStock} (Expected: 40)`);

    console.log("5. Simulating failing shipment due to insufficient stock (Quantity: 10)");
    try {
      await runShipment(10);
      console.log("ERROR: Shipment succeeded but it should have failed!");
    } catch (error: any) {
      console.log("Expected Error caught:", error.message);
    }

    const checkP1AfterFail = await prisma.product.findUnique({ where: { id: p1.id } });
    const checkP2AfterFail = await prisma.product.findUnique({ where: { id: p2.id } });
    console.log(`P1 stock after fail: ${checkP1AfterFail?.currentStock} (Expected: 80)`);
    console.log(`P2 stock after fail: ${checkP2AfterFail?.currentStock} (Expected: 40)`);

  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    console.log("Cleanup...");
    await prisma.shipmentGroup.deleteMany({ where: { name: "Test Group" } });
    await prisma.product.deleteMany({ where: { name: { startsWith: "Test Product" } } });
  }
}

runTest();

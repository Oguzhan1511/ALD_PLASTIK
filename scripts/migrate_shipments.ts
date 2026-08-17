import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migration basliyor...");

  // 1. Tüm Grup Sevkiyatlarını al
  const groupShipments = await prisma.shipmentRecord.findMany({
    where: { type: "GRUP" },
    include: { productStockMovements: true },
  });

  console.log(`${groupShipments.length} adet grup sevkiyat bulundu.`);

  for (const gs of groupShipments) {
    const hasAna = gs.productStockMovements.some(m => m.type === "GRUP_SEVKIYAT_CIKISI");
    if (!hasAna) {
      // İlk üründen ana kayıt üret
      const firstMove = gs.productStockMovements[0];
      if (firstMove) {
        console.log(`Shipment ${gs.id} için ana kayıt oluşturuluyor...`);
        await prisma.productStockMovement.create({
          data: {
            productId: firstMove.productId,
            type: "GRUP_SEVKIYAT_CIKISI",
            quantity: -parseFloat(gs.quantity.toString()),
            date: gs.date,
            description: gs.description || "Grup sevkiyatı ana kaydı",
            shipmentRecordId: gs.id,
          }
        });
        
        // Diğer SEVKIYAT_CIKISI tiplerini SEVKIYAT_ALT_CIKISI yap
        await prisma.productStockMovement.updateMany({
          where: { shipmentRecordId: gs.id, type: "SEVKIYAT_CIKISI" },
          data: { type: "SEVKIYAT_ALT_CIKISI" }
        });
      }
    } else {
      console.log(`Shipment ${gs.id} zaten göç etmiş.`);
    }
  }

  console.log("Migration tamamlandı.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

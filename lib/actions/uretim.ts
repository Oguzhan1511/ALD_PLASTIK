"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { requireAuth } from "@/lib/auth-guard";
import { parseIntInput } from "@/lib/utils";

// ─────────────────────────────────────────────
// Üretim Kayıtları Listesi
// ─────────────────────────────────────────────
export async function getProductionRecords(limit?: number) {
  await requireAuth();
  return prisma.productionRecord.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      product: true,
      stockMovements: {
        include: { rawMaterial: true },
      },
      productStockMovements: {
        select: { type: true },
      },
    },
  });
}

// ─────────────────────────────────────────────
// Üretim Kaydı Oluştur (Transaction + Stok Kontrolü)
// ─────────────────────────────────────────────
export async function createProductionRecord(formData: FormData) {
  await requireAuth();

  const productId = formData.get("productId") as string;
  const quantityStr = formData.get("quantity") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!productId) throw new Error("Ürün seçimi zorunludur.");

  const quantity = parseIntInput(quantityStr, "Üretilen adet");
  if (quantity <= 0) throw new Error("Üretilen adet pozitif bir tam sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  const result = await executeProduction(productId, quantity, date, description || null);

  revalidatePath("/uretim");
  revalidatePath("/hammaddeler");
  revalidatePath("/hareketler");
  revalidatePath("/");

  return { success: true, data: result };
}

// ─────────────────────────────────────────────
// Üretim Kaydı İç Mantığı (Onaylama için)
// ─────────────────────────────────────────────
export async function executeProduction(productId: string, quantity: number, date: Date, description: string | null) {
  // Ürün ve reçetelerini al — hem hammadde hem alt ürün bileşenleri dahil
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      recipes: {
        include: {
          rawMaterial: true,
          componentProduct: true,
        },
      },
    },
  });

  if (!product) throw new Error("Seçilen ürün bulunamadı.");
  if (product.recipes.length === 0) {
    throw new Error(`"${product.name}" ürünü için reçete tanımlanmamış. Önce /urunler sayfasından reçete ekleyin.`);
  }

  // Stok kontrolüne alınacak satırlar
  const hammaddeRecipes = product.recipes.filter((r) => r.rawMaterialId && r.rawMaterial);
  const urunRecipes = product.recipes.filter((r) => r.componentProductId && r.componentProduct);

  // ─── Stok Yeterlilik Kontrolü (işlem öncesi — kullanıcıya hızlı geri bildirim) ───
  const stockErrors: string[] = [];

  for (const recipe of hammaddeRecipes) {
    const rawMaterial = recipe.rawMaterial!;
    if (new Decimal(recipe.quantityPerUnit).equals(0)) continue; // miktar 0 ise atla

    const wasteFactor = new Decimal(1).add(new Decimal(recipe.wastePercentage));
    const required = new Decimal(recipe.quantityPerUnit).mul(quantity).mul(wasteFactor);
    const available = new Decimal(rawMaterial.currentStock);

    if (available.lessThan(required)) {
      stockErrors.push(
        `Yetersiz stok: ${rawMaterial.name} — Gereken: ${required.toFixed(2)} ${rawMaterial.unit}, Mevcut: ${available.toFixed(2)} ${rawMaterial.unit}`
      );
    }
  }

  for (const recipe of urunRecipes) {
    const componentProduct = recipe.componentProduct!;
    if (new Decimal(recipe.quantityPerUnit).equals(0)) continue;

    const wasteFactor = new Decimal(1).add(new Decimal(recipe.wastePercentage));
    const required = new Decimal(recipe.quantityPerUnit).mul(quantity).mul(wasteFactor);
    const available = new Decimal(componentProduct.currentStock);

    if (available.lessThan(required)) {
      stockErrors.push(
        `Yetersiz stok: ${componentProduct.name} (Alt Ürün) — Gereken: ${required.toFixed(2)} adet, Mevcut: ${available.toFixed(2)} adet`
      );
    }
  }

  if (stockErrors.length > 0) {
    throw new Error(stockErrors.join("\n"));
  }

  // ─── Transaction: Kayıt + Stok Düşümü ───
  const result = await prisma.$transaction(async (tx) => {
    // 1. Üretim kaydını oluştur
    const productionRecord = await tx.productionRecord.create({
      data: {
        productId,
        quantity,
        date,
        description: description?.trim() || null,
      },
    });

    // 2. Hammadde reçete satırları için stok düş + hareket kaydet
    const movements = [];
    for (const recipe of hammaddeRecipes) {
      const rawMaterial = recipe.rawMaterial!;
      if (new Decimal(recipe.quantityPerUnit).equals(0)) continue;

      const wasteFactor = new Decimal(1).add(new Decimal(recipe.wastePercentage));
      const deductAmount = new Decimal(recipe.quantityPerUnit).mul(quantity).mul(wasteFactor);

      const updateResult = await tx.rawMaterial.updateMany({
        where: {
          id: recipe.rawMaterialId!,
          currentStock: { gte: deductAmount.toNumber() },
        },
        data: { currentStock: { decrement: deductAmount.toNumber() } },
      });

      // count === 0 → stok bu arada başka bir işlemle düşmüş
      if (updateResult.count === 0) {
        throw new Error(
          `Yetersiz stok: ${rawMaterial.name} — işlem sırasında stok değişti, lütfen tekrar deneyin.`
        );
      }

      await tx.stockMovement.create({
        data: {
          rawMaterialId: recipe.rawMaterialId!,
          type: "URETIM_CIKISI",
          amount: deductAmount.toNumber(),
          date,
          description: `${product.name} - ${quantity} adet üretim`,
          productionRecordId: productionRecord.id,
        },
      });

      movements.push({
        rawMaterialName: rawMaterial.name,
        unit: rawMaterial.unit,
        amount: deductAmount.toNumber(),
      });
    }

    // 2.5 Alt Ürün reçete satırları için stok düş + hareket kaydet
    for (const recipe of urunRecipes) {
      const componentProduct = recipe.componentProduct!;
      if (new Decimal(recipe.quantityPerUnit).equals(0)) continue;

      const wasteFactor = new Decimal(1).add(new Decimal(recipe.wastePercentage));
      const deductAmount = new Decimal(recipe.quantityPerUnit).mul(quantity).mul(wasteFactor);

      const updateResult = await tx.product.updateMany({
        where: {
          id: recipe.componentProductId!,
          currentStock: { gte: deductAmount.toNumber() },
        },
        data: { currentStock: { decrement: deductAmount.toNumber() } },
      });

      if (updateResult.count === 0) {
        throw new Error(
          `Yetersiz stok: ${componentProduct.name} (Alt Ürün) — işlem sırasında stok değişti, lütfen tekrar deneyin.`
        );
      }

      await tx.productStockMovement.create({
        data: {
          productId: recipe.componentProductId!,
          type: "ALT_MONTAJ_CIKISI",
          quantity: -deductAmount.toNumber(),
          date,
          description: `${product.name} üretimi için alt ürün çıkışı`,
          productionRecordId: productionRecord.id,
        },
      });

      movements.push({
        rawMaterialName: componentProduct.name, // using same key for frontend preview
        unit: "adet",
        amount: deductAmount.toNumber(),
      });
    }

    // 3. Ürün stoğunu artır + ProductStockMovement kaydet
    await tx.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } },
    });

    await tx.productStockMovement.create({
      data: {
        productId,
        type: "URETIM_GIRISI",
        quantity,
        date,
        description: `Üretim: ${quantity} adet üretildi`,
        productionRecordId: productionRecord.id,
      },
    });

    return { productionRecord, movements, productName: product.name, quantity };
  });

  return result;
}

// ─────────────────────────────────────────────
// Üretim Kaydı İptal (Rollback)
// ─────────────────────────────────────────────
export async function cancelProductionRecord(productionRecordId: string) {
  await requireAuth();

  const record = await prisma.productionRecord.findUnique({
    where: { id: productionRecordId },
    include: {
      product: true,
      stockMovements: {
        include: { rawMaterial: true },
      },
      productStockMovements: true,
    },
  });

  if (!record) throw new Error("Üretim kaydı bulunamadı.");

  // İptal edilmiş kayıtları tekrar iptal etme kontrolü
  const alreadyCancelled = record.productStockMovements.some(
    (m) => m.type === "URETIM_IPTALI"
  );
  if (alreadyCancelled) throw new Error("Bu üretim kaydı zaten iptal edilmiş.");

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const cancelDesc = `Üretim iptali: ${record.product.name} - ${record.quantity} adet (Orijinal kayıt: ${new Date(record.date).toLocaleDateString("tr-TR")})`;

    // 1. Hammadde stoklarını geri yükle (her stok hareketi için tersine kayıt)
    for (const movement of record.stockMovements) {
      if (movement.type !== "URETIM_CIKISI") continue;

      await tx.rawMaterial.update({
        where: { id: movement.rawMaterialId },
        data: { currentStock: { increment: movement.amount } },
      });

      await tx.stockMovement.create({
        data: {
          rawMaterialId: movement.rawMaterialId,
          type: "URETIM_IPTALI",
          amount: movement.amount, // pozitif = stok geri eklendi
          date: now,
          description: cancelDesc,
          productionRecordId: record.id,
        },
      });
    }

    // 2. Üretimde kullanılan alt ürün stoklarını geri yükle
    for (const psm of record.productStockMovements) {
      if (psm.type !== "ALT_MONTAJ_CIKISI") continue;

      await tx.product.update({
        where: { id: psm.productId },
        data: { currentStock: { increment: Math.abs(psm.quantity.toNumber()) } },
      });

      await tx.productStockMovement.create({
        data: {
          productId: psm.productId,
          type: "URETIM_IPTALI",
          quantity: Math.abs(psm.quantity.toNumber()), // pozitif = stok geri eklendi
          date: now,
          description: cancelDesc,
          productionRecordId: record.id,
        },
      });
    }

    // 3. Üretilen ürünün stokunu düş (URETIM_GIRISI tersine çevrilir)
    const productionGiris = record.productStockMovements.find(
      (m) => m.type === "URETIM_GIRISI"
    );
    if (productionGiris) {
      await tx.product.update({
        where: { id: record.productId },
        data: { currentStock: { decrement: productionGiris.quantity.toNumber() } },
      });

      await tx.productStockMovement.create({
        data: {
          productId: record.productId,
          type: "URETIM_IPTALI",
          quantity: -productionGiris.quantity.toNumber(), // negatif = stok düşüldü
          date: now,
          description: cancelDesc,
          productionRecordId: record.id,
        },
      });
    }
  });

  revalidatePath("/uretim");
  revalidatePath("/hammaddeler");
  revalidatePath("/hareketler");
  revalidatePath("/urunler");

  return { success: true };
}

"use server";

import { prisma } from "@/lib/prisma";
import { parseIntInput, parseDecimalInput } from "@/lib/utils";
import { requireAuth } from "@/lib/auth-guard";
import { executeProduction } from "./uretim";
import { executeSingleShipment } from "./sevkiyat";
import { revalidatePath } from "next/cache";

export async function getActiveProducts() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return products;
}

export async function getRecentPendingEntries(types: string[], limit: number = 20) {
  return prisma.pendingEntry.findMany({
    where: { type: { in: types } },
    include: { product: true, rawMaterial: true },
    orderBy: { submittedAt: "desc" },
    take: limit,
  });
}

export async function getActiveRawMaterials() {
  const materials = await prisma.rawMaterial.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      code: true,
      unit: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return materials;
}

export async function createPendingProductionEntry(formData: FormData) {
  const productId = formData.get("productId") as string;
  const quantity = parseIntInput(formData.get("quantity") as string);
  const submittedByName = formData.get("submittedByName") as string;

  if (!productId) {
    throw new Error("Lütfen bir ürün seçin.");
  }
  if (!quantity || quantity <= 0) {
    throw new Error("Lütfen geçerli bir adet girin.");
  }
  if (!submittedByName || submittedByName.trim() === "") {
    throw new Error("Lütfen adınızı yazın.");
  }

  const entry = await prisma.pendingEntry.create({
    data: {
      type: "URETIM",
      productId,
      quantity,
      submittedByName: submittedByName.trim(),
      status: "BEKLIYOR",
    },
  });

  return { success: true, id: entry.id };
}

export async function createPendingShipmentEntry(formData: FormData) {
  const itemType = formData.get("itemType") as string; // PRODUCT | RAW_MATERIAL
  const direction = formData.get("direction") as string; // GIRIS | CIKIS
  const itemId = formData.get("itemId") as string;
  const quantity = parseDecimalInput(formData.get("quantity") as string);
  const submittedByName = formData.get("submittedByName") as string;

  if (!itemType || !direction) {
    throw new Error("Geçersiz form verisi.");
  }
  if (!itemId) {
    throw new Error("Lütfen bir öğe seçin.");
  }
  if (!quantity || quantity <= 0) {
    throw new Error("Lütfen geçerli bir miktar girin.");
  }
  if (!submittedByName || submittedByName.trim() === "") {
    throw new Error("Lütfen adınızı yazın.");
  }

  const typeMap: Record<string, string> = {
    "GIRIS": "SEVKIYAT_GIRISI",
    "CIKIS": "SEVKIYAT_CIKISI"
  };

  const pendingType = typeMap[direction];
  if (!pendingType) throw new Error("Geçersiz yön.");

  const data: any = {
    type: pendingType,
    quantity,
    submittedByName: submittedByName.trim(),
    status: "BEKLIYOR",
  };

  if (itemType === "PRODUCT") {
    data.productId = itemId;
  } else if (itemType === "RAW_MATERIAL") {
    data.rawMaterialId = itemId;
  } else {
    throw new Error("Geçersiz öğe tipi.");
  }

  const entry = await prisma.pendingEntry.create({
    data,
  });

  return { success: true, id: entry.id };
}

// ─────────────────────────────────────────────
// Yönetici İşlemleri
// ─────────────────────────────────────────────
export async function getPendingEntries(status: string = "BEKLIYOR") {
  await requireAuth();
  return prisma.pendingEntry.findMany({
    where: { status },
    include: { product: true, rawMaterial: true },
    orderBy: { submittedAt: "desc" },
  });
}

export async function approvePendingEntry(id: string) {
  await requireAuth();
  
  const entry = await prisma.pendingEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Kayıt bulunamadı.");
  if (entry.status !== "BEKLIYOR") throw new Error("Bu kayıt zaten işlenmiş.");

  const now = new Date();
  
  try {
    if (entry.type === "URETIM") {
      if (!entry.productId) throw new Error("Üretim için ürün ID gerekli.");
      const result = await executeProduction(
        entry.productId, 
        entry.quantity.toNumber(), 
        now, 
        `Usta bildirimi (Üretim)`
      );
      
      await prisma.pendingEntry.update({
        where: { id },
        data: {
          status: "ONAYLANDI",
          reviewedAt: now,
          productionRecordId: result.productionRecord.id,
        },
      });
      
    } else if (entry.type === "SEVKIYAT" || entry.type === "SEVKIYAT_CIKISI") {
      if (entry.productId) {
        // Ürün sevkiyatı — miktarı tam sayıya yuvarla (ondalıklı adet tutarsızlığını önler)
        const intQuantity = Math.round(entry.quantity.toNumber());
        const result = await executeSingleShipment(
          entry.productId, 
          intQuantity, 
          now, 
          `Usta bildirimi (Sevkiyat Çıkış)`
        );
        
        await prisma.pendingEntry.update({
          where: { id },
          data: {
            status: "ONAYLANDI",
            reviewedAt: now,
            shipmentRecordId: result.id,
          },
        });
      } else if (entry.rawMaterialId) {
        // ─── DÜZELTME 1: Hammadde çıkışında stok yeterlilik kontrolü ───
        const rawMaterial = await prisma.rawMaterial.findUnique({
          where: { id: entry.rawMaterialId },
          select: { currentStock: true, name: true },
        });
        if (!rawMaterial) throw new Error("Hammadde bulunamadı.");
        if (rawMaterial.currentStock.lessThan(entry.quantity)) {
          throw new Error(
            `Yetersiz stok: ${rawMaterial.name} — Gereken: ${entry.quantity}, Mevcut: ${rawMaterial.currentStock}`
          );
        }

        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.rawMaterial.updateMany({
            where: {
              id: entry.rawMaterialId!,
              currentStock: { gte: entry.quantity.toNumber() },
            },
            data: { currentStock: { decrement: entry.quantity } },
          });

          if (updateResult.count === 0) {
            throw new Error("Yetersiz stok: İşlem sırasında stok değişti, lütfen tekrar deneyin.");
          }

          await tx.stockMovement.create({
            data: {
              rawMaterialId: entry.rawMaterialId!,
              type: "SEVKIYAT_CIKISI",
              amount: -entry.quantity.toNumber(),
              date: now,
              description: `Usta bildirimi (Sevkiyat Çıkış)`,
            },
          });

          await tx.pendingEntry.update({
            where: { id },
            data: {
              status: "ONAYLANDI",
              reviewedAt: now,
            },
          });
        });
      }
    } else if (entry.type === "SEVKIYAT_GIRISI") {
      if (entry.productId) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: entry.productId! },
            data: { currentStock: { increment: entry.quantity } },
          });

          await tx.productStockMovement.create({
            data: {
              productId: entry.productId!,
              type: "SEVKIYAT_GIRISI",
              quantity: entry.quantity.toNumber(),
              date: now,
              description: `Usta bildirimi (Sevkiyat Giriş)`,
            },
          });

          await tx.pendingEntry.update({
            where: { id },
            data: {
              status: "ONAYLANDI",
              reviewedAt: now,
            },
          });
        });
      } else if (entry.rawMaterialId) {
        await prisma.$transaction(async (tx) => {
          await tx.rawMaterial.update({
            where: { id: entry.rawMaterialId! },
            data: { currentStock: { increment: entry.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              rawMaterialId: entry.rawMaterialId!,
              type: "SEVKIYAT_GIRISI",
              amount: entry.quantity.toNumber(),
              date: now,
              description: `Usta bildirimi (Sevkiyat Giriş)`,
            },
          });

          await tx.pendingEntry.update({
            where: { id },
            data: {
              status: "ONAYLANDI",
              reviewedAt: now,
            },
          });
        });
      }
    }

    revalidatePath("/raporlar");
    revalidatePath("/uretim");
    revalidatePath("/sevkiyat");
    revalidatePath("/hammaddeler");
    revalidatePath("/urunler");
    revalidatePath("/hareketler");
    
    return { success: true };
    
  } catch (error: any) {
    throw new Error(`Onaylanamadı: ${error.message}`);
  }
}

export async function rejectPendingEntry(id: string, reason: string) {
  await requireAuth();
  
  const entry = await prisma.pendingEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Kayıt bulunamadı.");
  if (entry.status !== "BEKLIYOR") throw new Error("Bu kayıt zaten işlenmiş.");
  
  if (!reason || reason.trim() === "") {
    throw new Error("Reddetme sebebi zorunludur.");
  }

  await prisma.pendingEntry.update({
    where: { id },
    data: {
      status: "REDDEDILDI",
      reviewedAt: new Date(),
      rejectionReason: reason.trim(),
    },
  });

  revalidatePath("/raporlar");
  return { success: true };
}

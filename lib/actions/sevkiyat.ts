"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { requireAuth } from "@/lib/auth-guard";
import { parseIntInput, parseDecimalInput } from "@/lib/utils";

// ─────────────────────────────────────────────
// Sevkiyat Grupları Listesi
// ─────────────────────────────────────────────
export async function getShipmentGroups() {
  await requireAuth();
  return prisma.shipmentGroup.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// Sevkiyat Grubu Oluştur
// ─────────────────────────────────────────────
export async function createShipmentGroup(formData: FormData) {
  await requireAuth();
  const name = formData.get("name") as string;
  const codeRaw = (formData.get("code") as string)?.trim() || null;

  if (!name?.trim()) throw new Error("Sevkiyat grubu adı zorunludur.");

  const existing = await prisma.shipmentGroup.findFirst({ where: { name: name.trim(), isDeleted: false } });
  if (existing) {
    throw new Error(`"${name}" adında bir sevkiyat grubu zaten mevcut.`);
  }

  let warningMessage: string | undefined;
  if (codeRaw) {
    const existingCode = await prisma.shipmentGroup.findFirst({ where: { code: codeRaw } });
    if (existingCode) {
      warningMessage = `"${codeRaw}" kodu başka bir sevkiyat grubunda da kullanılıyor, yine de kaydedildi.`;
    }
  }

  const itemsRaw = formData.get("items") as string;
  let itemsToCreate: any[] = [];
  if (itemsRaw) {
    try {
      itemsToCreate = JSON.parse(itemsRaw);
    } catch (e) {}
  }

  await prisma.shipmentGroup.create({
    data: {
      name: name.trim(),
      code: codeRaw,
      items: itemsToCreate.length > 0 ? {
        create: itemsToCreate.map(i => ({
          productId: i.productId,
          quantityPerUnit: parseFloat(i.quantityPerUnit),
        }))
      } : undefined
    },
  });

  revalidatePath("/sevkiyat");
  return { success: true, warning: warningMessage };
}

// ─────────────────────────────────────────────
// Sevkiyat Grubu Güncelle
// ─────────────────────────────────────────────
export async function updateShipmentGroup(id: string, formData: FormData) {
  await requireAuth();
  const name = formData.get("name") as string;
  const codeRaw = (formData.get("code") as string)?.trim() || null;

  if (!name?.trim()) throw new Error("Sevkiyat grubu adı zorunludur.");

  const existing = await prisma.shipmentGroup.findFirst({
    where: { name: name.trim(), isDeleted: false, NOT: { id } },
  });
  if (existing) {
    throw new Error(`"${name}" adında bir sevkiyat grubu zaten mevcut.`);
  }

  let warningMessage: string | undefined;
  if (codeRaw) {
    const existingCode = await prisma.shipmentGroup.findFirst({
      where: { code: codeRaw, NOT: { id } },
    });
    if (existingCode) {
      warningMessage = `"${codeRaw}" kodu başka bir sevkiyat grubunda da kullanılıyor, yine de güncellendi.`;
    }
  }

  await prisma.shipmentGroup.update({
    where: { id },
    data: {
      name: name.trim(),
      code: codeRaw,
    },
  });

  revalidatePath("/sevkiyat");
  return { success: true, warning: warningMessage };
}

// ─────────────────────────────────────────────
// Sevkiyat Grubuna Ürün Ekle
// ─────────────────────────────────────────────
export async function addShipmentGroupItem(formData: FormData) {
  await requireAuth();
  const shipmentGroupId = formData.get("shipmentGroupId") as string;
  const productId = formData.get("productId") as string;
  const quantityRaw = (formData.get("quantityPerUnit") as string)?.trim();

  if (!shipmentGroupId || !productId) throw new Error("Grup ve ürün seçimi zorunludur.");

  const quantityPerUnit = parseDecimalInput(quantityRaw || "0", "Miktar");
  if (quantityPerUnit <= 0) throw new Error("Miktar pozitif olmalıdır.");

  const existing = await prisma.shipmentGroupItem.findUnique({
    where: {
      shipmentGroupId_productId: {
        shipmentGroupId,
        productId,
      },
    },
  });

  if (existing) {
    throw new Error("Bu ürün zaten bu sevkiyat grubuna eklenmiş.");
  }

  await prisma.shipmentGroupItem.create({
    data: {
      shipmentGroupId,
      productId,
      quantityPerUnit,
    },
  });

  revalidatePath("/sevkiyat");
  return { success: true };
}

// ─────────────────────────────────────────────
// Sevkiyat Grubu Ürününü Sil
// ─────────────────────────────────────────────
export async function deleteShipmentGroupItem(itemId: string) {
  await requireAuth();
  await prisma.shipmentGroupItem.delete({ where: { id: itemId } });
  revalidatePath("/sevkiyat");
  return { success: true };
}

// ─────────────────────────────────────────────
// Sevkiyat Grubunu Sil
// ─────────────────────────────────────────────
export async function deleteShipmentGroup(id: string) {
  await requireAuth();
  await prisma.shipmentGroup.update({ 
    where: { id },
    data: { isDeleted: true }
  });
  revalidatePath("/sevkiyat");
  return { success: true };
}

// ─────────────────────────────────────────────
// Tekil Ürün Sevkiyatı (Transaction + Stok Kontrolü)
// ─────────────────────────────────────────────
export async function createSingleProductShipment(formData: FormData) {
  await requireAuth();

  const productId = formData.get("productId") as string;
  const quantityStr = formData.get("quantity") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!productId) throw new Error("Ürün seçimi zorunludur.");

  const quantity = parseIntInput(quantityStr, "Sevk edilen miktar");
  if (quantity <= 0) throw new Error("Sevk edilen miktar pozitif bir tam sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  const result = await executeSingleShipment(productId, quantity, date, description || null);

  revalidatePath("/sevkiyat");
  revalidatePath("/urunler");
  revalidatePath("/hareketler");
  revalidatePath("/");

  return { success: true };
}

// ─────────────────────────────────────────────
// Tekil Sevkiyat İç Mantığı (Onaylama için)
// ─────────────────────────────────────────────
export async function executeSingleShipment(productId: string, quantity: number, date: Date, description: string | null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) throw new Error("Seçilen ürün bulunamadı.");

  // ÖN KONTROL
  const available = new Decimal(product.currentStock);
  if (available.lessThan(quantity)) {
    throw new Error(`Yetersiz stok: ${product.name} — Gereken: ${quantity}, Mevcut: ${available.toNumber()}`);
  }

  // TRANSACTION: Kayıt + Stok Düşümü
  const result = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.product.updateMany({
      where: {
        id: productId,
        currentStock: { gte: quantity },
      },
      data: { currentStock: { decrement: quantity } },
    });

    if (updateResult.count === 0) {
      throw new Error(`Yetersiz stok: ${product.name} — işlem sırasında stok değişti, lütfen tekrar deneyin.`);
    }

    const shipmentRecord = await tx.shipmentRecord.create({
      data: {
        type: "TEKIL_URUN",
        productId,
        quantity,
        date,
        description: description?.trim() || null,
      },
    });

    await tx.productStockMovement.create({
      data: {
        productId,
        type: "SEVKIYAT_CIKISI",
        quantity: -quantity, // negatif = çıkış
        date,
        description: description?.trim() || `Tekil sevkiyat: ${quantity} adet`,
        shipmentRecordId: shipmentRecord.id,
      },
    });

    return shipmentRecord;
  });

  return result;
}

// ─────────────────────────────────────────────
// Grup Sevkiyatı (Transaction + Stok Kontrolü)
// ─────────────────────────────────────────────
export async function createGroupShipment(formData: FormData) {
  await requireAuth();

  const shipmentGroupId = formData.get("shipmentGroupId") as string;
  const quantityStr = formData.get("quantity") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!shipmentGroupId) throw new Error("Sevkiyat grubu seçimi zorunludur.");

  const quantity = parseIntInput(quantityStr, "Sevk edilen grup adedi");
  if (quantity <= 0) throw new Error("Sevk edilen grup adedi pozitif bir tam sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  const group = await prisma.shipmentGroup.findUnique({
    where: { id: shipmentGroupId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!group) throw new Error("Seçilen sevkiyat grubu bulunamadı.");
  if (group.items.length === 0) throw new Error("Seçilen sevkiyat grubunda ürün bulunmuyor.");

  // ÖN KONTROL
  const stockErrors: string[] = [];
  for (const item of group.items) {
    const required = new Decimal(item.quantityPerUnit).mul(quantity);
    const available = new Decimal(item.product.currentStock);

    if (available.lessThan(required)) {
      stockErrors.push(
        `Yetersiz stok: ${item.product.name} — Gereken: ${required.toNumber()}, Mevcut: ${available.toNumber()}`
      );
    }
  }

  if (stockErrors.length > 0) {
    throw new Error(stockErrors.join("\n"));
  }

  // TRANSACTION: Kayıt + Stok Düşümü
  const result = await prisma.$transaction(async (tx) => {
    const shipmentRecord = await tx.shipmentRecord.create({
      data: {
        type: "GRUP",
        shipmentGroupId,
        quantity,
        date,
        description: description?.trim() || null,
      },
    });

    // Ana Grup Hareketi (temsili)
    const firstItem = group.items[0];
    if (firstItem) {
      await tx.productStockMovement.create({
        data: {
          productId: firstItem.productId, // Temsili
          type: "GRUP_SEVKIYAT_CIKISI",
          quantity: -quantity,
          date,
          description: description?.trim() || `${group.name} sevkiyatı`,
          shipmentRecordId: shipmentRecord.id,
        },
      });
    }

    for (const item of group.items) {
      const deductAmount = new Decimal(item.quantityPerUnit).mul(quantity);

      const updateResult = await tx.product.updateMany({
        where: {
          id: item.productId,
          currentStock: { gte: deductAmount.toNumber() },
        },
        data: { currentStock: { decrement: deductAmount.toNumber() } },
      });

      if (updateResult.count === 0) {
        throw new Error(
          `Yetersiz stok: ${item.product.name} — işlem sırasında stok değişti, lütfen tekrar deneyin.`
        );
      }

      await tx.productStockMovement.create({
        data: {
          productId: item.productId,
          type: "SEVKIYAT_ALT_CIKISI",
          quantity: -deductAmount.toNumber(), // negatif = çıkış
          date,
          description: `Grup içi: ${item.product.name} çıkışı`,
          shipmentRecordId: shipmentRecord.id,
        },
      });
    }

    return shipmentRecord;
  });

  revalidatePath("/sevkiyat");
  revalidatePath("/urunler");
  revalidatePath("/hareketler");
  revalidatePath("/");

  return { success: true };
}

// ─────────────────────────────────────────────
// Sevkiyat Kayıtları Listesi
// ─────────────────────────────────────────────
export async function getShipmentRecords(limit?: number) {
  await requireAuth();
  return prisma.shipmentRecord.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      product: true,
      shipmentGroup: true,
      productStockMovements: true,
    },
  });
}

export async function getShipmentRecordsPaginated({ page = 1, pageSize = 20, type, startDate, endDate }: { page?: number, pageSize?: number, type?: "TEKIL_URUN" | "GRUP", startDate?: string, endDate?: string } = {}) {
  await requireAuth();

  const where: any = {};
  if (type) {
    where.type = type;
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }
  
  const [records, total] = await Promise.all([
    prisma.shipmentRecord.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: true,
        shipmentGroup: true,
        productStockMovements: {
          include: { product: true }
        },
      },
    }),
    prisma.shipmentRecord.count({ where }),
  ]);

  return JSON.parse(JSON.stringify({ records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
}

// ─────────────────────────────────────────────
// Sevkiyat Kaydı İptal (Rollback)
// ─────────────────────────────────────────────
export async function cancelShipmentRecord(shipmentRecordId: string) {
  await requireAuth();

  const record = await prisma.shipmentRecord.findUnique({
    where: { id: shipmentRecordId },
    include: {
      product: true,
      shipmentGroup: {
        include: { items: { include: { product: true } } },
      },
      productStockMovements: true,
    },
  });

  if (!record) throw new Error("Sevkiyat kaydı bulunamadı.");

  // Zaten iptal edilmiş mi?
  const alreadyCancelled = record.productStockMovements.some(
    (m) => m.type === "SEVKIYAT_IPTALI"
  );
  if (alreadyCancelled) throw new Error("Bu sevkiyat kaydı zaten iptal edilmiş.");

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const cancelDesc = `Sevkiyat iptali (Orijinal kayıt: ${new Date(record.date).toLocaleDateString("tr-TR")})`;

    // Sevkiyat çıkış hareketlerini tersine çevir (stokları geri yükle)
    for (const psm of record.productStockMovements) {
      if (psm.type !== "SEVKIYAT_CIKISI") continue;

      // Stok geri ekle
      await tx.product.update({
        where: { id: psm.productId },
        data: { currentStock: { increment: Math.abs(psm.quantity.toNumber()) } },
      });

      // İptal hareketi kaydet
      await tx.productStockMovement.create({
        data: {
          productId: psm.productId,
          type: "SEVKIYAT_IPTALI",
          quantity: Math.abs(psm.quantity.toNumber()), // pozitif = stok geri eklendi
          date: now,
          description: cancelDesc,
          shipmentRecordId: record.id,
        },
      });
    }
  });

  revalidatePath("/sevkiyat");
  revalidatePath("/urunler");
  revalidatePath("/hareketler");

  return { success: true };
}

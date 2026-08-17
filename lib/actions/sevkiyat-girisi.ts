"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { parseDecimalInput } from "@/lib/utils";

// ─────────────────────────────────────────────
// Sevkiyat Girişi Oluştur (Hammadde veya Ürün)
// ─────────────────────────────────────────────
export async function createSevkiyatGirisi(formData: FormData) {
  await requireAuth();

  const type = formData.get("type") as "raw" | "product"; // "raw" veya "product"
  const itemId = formData.get("itemId") as string;
  const quantityStr = formData.get("quantity") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!type || !["raw", "product"].includes(type)) {
    throw new Error("Geçersiz giriş türü.");
  }
  if (!itemId) {
    throw new Error("Lütfen giriş yapılacak kalemi seçin.");
  }

  const quantity = parseDecimalInput(quantityStr, "Miktar/Adet");
  if (quantity <= 0) {
    throw new Error("Miktar pozitif bir sayı olmalıdır.");
  }

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.$transaction(async (tx) => {
    if (type === "raw") {
      // Hammadde Girişi
      const rm = await tx.rawMaterial.findUnique({ where: { id: itemId } });
      if (!rm) throw new Error("Seçilen hammadde bulunamadı.");

      // 1. Stok Hareketi
      await tx.stockMovement.create({
        data: {
          rawMaterialId: itemId,
          type: "SEVKIYAT_GIRISI",
          amount: quantity,
          date,
          description: description?.trim() || "Sevkiyat Girişi",
        },
      });

      // 2. Stok Güncelleme
      await tx.rawMaterial.update({
        where: { id: itemId },
        data: { currentStock: { increment: quantity } },
      });
    } else {
      // Ürün Girişi
      const p = await tx.product.findUnique({ where: { id: itemId } });
      if (!p) throw new Error("Seçilen ürün bulunamadı.");

      // 1. Ürün Stok Hareketi
      await tx.productStockMovement.create({
        data: {
          productId: itemId,
          type: "SEVKIYAT_GIRISI",
          quantity: quantity, // pozitif
          date,
          description: description?.trim() || "Sevkiyat Girişi",
        },
      });

      // 2. Stok Güncelleme
      await tx.product.update({
        where: { id: itemId },
        data: { currentStock: { increment: quantity } },
      });
    }
  });

  revalidatePath("/sevkiyat-girisi");
  revalidatePath("/hammaddeler");
  revalidatePath("/urunler");
  revalidatePath("/urun-stok");
  revalidatePath("/hareketler");
  revalidatePath("/");

  return { success: true };
}

// ─────────────────────────────────────────────
// Son Sevkiyat Girişlerini Getir
// ─────────────────────────────────────────────
export async function getRecentSevkiyatGirisleri(limit: number = 20) {
  await requireAuth();

  // Hammadde sevkiyat girişlerini al
  const rawMovements = await prisma.stockMovement.findMany({
    where: { type: "SEVKIYAT_GIRISI" },
    orderBy: { date: "desc" },
    take: limit,
    include: { rawMaterial: true },
  });

  // Ürün sevkiyat girişlerini al
  const productMovements = await prisma.productStockMovement.findMany({
    where: { type: "SEVKIYAT_GIRISI" },
    orderBy: { date: "desc" },
    take: limit,
    include: { product: true },
  });

  // İkisini birleştir, sırala ve aynı tipte objeler haline getir
  const combined = [
    ...rawMovements.map(m => ({
      id: `raw_${m.id}`,
      type: "raw" as const,
      name: m.rawMaterial.name,
      code: m.rawMaterial.code,
      unit: m.rawMaterial.unit,
      amount: Number(m.amount),
      date: m.date,
      description: m.description,
    })),
    ...productMovements.map(m => ({
      id: `prod_${m.id}`,
      type: "product" as const,
      name: m.product.name,
      code: m.product.code,
      unit: "adet",
      amount: Number(m.quantity),
      date: m.date,
      description: m.description,
    })),
  ];

  // Tarihe göre yeniden sırala
  combined.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Limiti uygula
  return combined.slice(0, limit);
}

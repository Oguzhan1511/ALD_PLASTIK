"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { parseDecimalInput } from "@/lib/utils";

// ─────────────────────────────────────────────
// Hammadde Listesi
// ─────────────────────────────────────────────
export async function getRawMaterials() {
  await requireAuth();
  return prisma.rawMaterial.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });
}

// ─────────────────────────────────────────────
// Hammadde Oluştur
// ─────────────────────────────────────────────
export async function createRawMaterial(formData: FormData) {
  await requireAuth();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const unit = formData.get("unit") as string;
  const criticalLevelStr = formData.get("criticalLevel") as string;

  if (!name?.trim()) throw new Error("Hammadde adı zorunludur.");
  if (!unit?.trim()) throw new Error("Birim zorunludur.");

  const currentStock = parseDecimalInput(formData.get("currentStock") as string, "Başlangıç stok miktarı");
  if (currentStock < 0) throw new Error("Başlangıç stok miktarı negatif olamaz.");

  let criticalLevel: number | null = null;
  if (criticalLevelStr && criticalLevelStr.trim() !== "") {
    criticalLevel = parseDecimalInput(criticalLevelStr, "Kritik seviye");
    if (criticalLevel < 0) throw new Error("Kritik seviye negatif olamaz.");
  }

  const existing = await prisma.rawMaterial.findUnique({ where: { name: name.trim() } });
  if (existing) throw new Error(`"${name}" adında bir hammadde zaten mevcut.`);

  const codeValue = code && code.trim() !== "" ? code.trim() : null;

  let warningMessage: string | undefined;
  if (codeValue) {
    const existingCode = await prisma.rawMaterial.findFirst({ where: { code: codeValue } });
    if (existingCode) {
      warningMessage = `"${codeValue}" koduna sahip başka bir hammadde daha var, yine de kaydedildi.`;
    }
  }

  const material = await prisma.rawMaterial.create({
    data: {
      name: name.trim(),
      code: codeValue,
      unit: unit.trim(),
      currentStock,
      criticalLevel,
    },
  });

  // Başlangıç stoku > 0 ise giriş hareketi kaydet
  if (currentStock > 0) {
    await prisma.stockMovement.create({
      data: {
        rawMaterialId: material.id,
        type: "GIRIS",
        amount: currentStock,
        description: "Başlangıç stoku",
      },
    });
  }

  revalidatePath("/hammaddeler");
  revalidatePath("/");
  return { success: true, warning: warningMessage };
}

// ─────────────────────────────────────────────
// Hammadde Güncelle
// ─────────────────────────────────────────────
export async function updateRawMaterial(id: string, formData: FormData) {
  await requireAuth();

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const unit = formData.get("unit") as string;
  const criticalLevelStr = formData.get("criticalLevel") as string;

  if (!name?.trim()) throw new Error("Hammadde adı zorunludur.");
  if (!unit?.trim()) throw new Error("Birim zorunludur.");

  let criticalLevel: number | null = null;
  if (criticalLevelStr && criticalLevelStr.trim() !== "") {
    criticalLevel = parseDecimalInput(criticalLevelStr, "Kritik seviye");
    if (criticalLevel < 0) throw new Error("Kritik seviye negatif olamaz.");
  }

  const existing = await prisma.rawMaterial.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (existing) throw new Error(`"${name}" adında başka bir hammadde zaten mevcut.`);

  const codeValue = code && code.trim() !== "" ? code.trim() : null;

  let warningMessage: string | undefined;
  if (codeValue) {
    const existingCode = await prisma.rawMaterial.findFirst({
      where: { code: codeValue, NOT: { id } },
    });
    if (existingCode) {
      warningMessage = `"${codeValue}" koduna sahip başka bir hammadde daha var, yine de güncellendi.`;
    }
  }

  await prisma.rawMaterial.update({
    where: { id },
    data: { name: name.trim(), code: codeValue, unit: unit.trim(), criticalLevel },
  });

  revalidatePath("/hammaddeler");
  revalidatePath("/");
  return { success: true, warning: warningMessage };
}

// ─────────────────────────────────────────────
// Hammadde Sil
// ─────────────────────────────────────────────
export async function deleteRawMaterial(id: string) {
  await requireAuth();

  const rm = await prisma.rawMaterial.findUnique({ where: { id } });
  if (!rm) throw new Error("Hammadde bulunamadı.");

  // Soft delete raw material and log movement
  await prisma.$transaction(async (tx) => {
    // 1. Mark as deleted and zero out stock
    await tx.rawMaterial.update({ 
      where: { id },
      data: { isDeleted: true, currentStock: 0 }
    });

    // 2. Log movement if there was stock, or just log deletion
    await tx.stockMovement.create({
      data: {
        rawMaterialId: id,
        type: "DUZELTME",
        amount: -Number(rm.currentStock),
        description: `Sistem: Hammadde silindi (Pasife alındı). Mevcut stok (${rm.currentStock}) sıfırlandı.`,
      }
    });
  });
  revalidatePath("/hammaddeler");
  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────────────────────
// Stok Girişi
// ─────────────────────────────────────────────
export async function addStockEntry(formData: FormData) {
  await requireAuth();

  const rawMaterialId = formData.get("rawMaterialId") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!rawMaterialId) throw new Error("Hammadde seçimi zorunludur.");

  const amount = parseDecimalInput(formData.get("amount") as string, "Miktar");
  if (amount <= 0) throw new Error("Miktar pozitif bir sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        rawMaterialId,
        type: "GIRIS",
        amount,
        date,
        description: description?.trim() || null,
      },
    });

    await tx.rawMaterial.update({
      where: { id: rawMaterialId },
      data: { currentStock: { increment: amount } },
    });
  });

  revalidatePath("/hammaddeler");
  revalidatePath("/hareketler");
  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────────────────────
// Stok Çıkışı
// ─────────────────────────────────────────────
export async function addStockExit(formData: FormData) {
  await requireAuth();

  const rawMaterialId = formData.get("rawMaterialId") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!rawMaterialId) throw new Error("Hammadde seçimi zorunludur.");

  const amount = parseDecimalInput(formData.get("amount") as string, "Miktar");
  if (amount <= 0) throw new Error("Miktar pozitif bir sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.$transaction(async (tx) => {
    const rm = await tx.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    if (!rm) throw new Error("Hammadde bulunamadı.");

    const current = parseFloat(rm.currentStock.toString());
    if (current < amount) {
      throw new Error(`Yetersiz stok! Mevcut: ${current}, İstenen: ${amount}`);
    }

    await tx.stockMovement.create({
      data: {
        rawMaterialId,
        type: "MANUEL_CIKIS",
        amount: -amount,
        date,
        description: description?.trim() || null,
      },
    });

    await tx.rawMaterial.update({
      where: { id: rawMaterialId },
      data: { currentStock: { decrement: amount } },
    });
  });

  revalidatePath("/hammaddeler");
  revalidatePath("/hareketler");
  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────────────────────
// Stok Düzeltme
// ─────────────────────────────────────────────
export async function adjustStock(formData: FormData) {
  await requireAuth();

  const rawMaterialId = formData.get("rawMaterialId") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!rawMaterialId) throw new Error("Hammadde seçimi zorunludur.");

  const newStock = parseDecimalInput(formData.get("newStock") as string, "Yeni Stok Değeri");
  if (newStock < 0) throw new Error("Stok miktarı negatif olamaz.");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.$transaction(async (tx) => {
    const rm = await tx.rawMaterial.findUnique({ where: { id: rawMaterialId } });
    if (!rm) throw new Error("Hammadde bulunamadı.");

    const current = parseFloat(rm.currentStock.toString());
    const difference = newStock - current;

    if (difference !== 0) {
      await tx.stockMovement.create({
        data: {
          rawMaterialId,
          type: "DUZELTME",
          amount: difference,
          date,
          description: description?.trim() || null,
        },
      });

      await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: { currentStock: newStock },
      });
    }
  });

  revalidatePath("/hammaddeler");
  revalidatePath("/hareketler");
  revalidatePath("/");
  return { success: true };
}

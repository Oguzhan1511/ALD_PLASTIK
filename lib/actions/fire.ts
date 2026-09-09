"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guard";

// ─────────────────────────────────────────────
// Fire Kaydı Oluştur
// ─────────────────────────────────────────────
export async function createFireRecord(
  productId: string,
  quantity: number,
  date: Date,
  description: string | null
) {
  if (quantity <= 0) return null;
  const record = await prisma.fireRecord.create({
    data: { productId, quantity, date, description },
  });
  revalidatePath("/fire");
  return record;
}

// ─────────────────────────────────────────────
// Fire Kayıtları — Aylık filtreli
// ─────────────────────────────────────────────
export async function getFireRecords(year: number, month: number, limit?: number) {
  await requireAuth();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  return prisma.fireRecord.findMany({
    where: { date: { gte: start, lte: end } },
    include: { product: { select: { id: true, name: true, code: true } } },
    orderBy: { date: "desc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────
// Ürün Bazında Fire Özeti (aylık)
// ─────────────────────────────────────────────
export async function getFireSummaryByProduct(year: number, month: number) {
  await requireAuth();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const records = await prisma.fireRecord.findMany({
    where: { date: { gte: start, lte: end } },
    include: { product: { select: { id: true, name: true, code: true } } },
  });

  // Ürün bazında topla
  const map = new Map<string, { productId: string; name: string; code: string | null; total: number }>();
  for (const r of records) {
    const existing = map.get(r.productId);
    if (existing) {
      existing.total += r.quantity;
    } else {
      map.set(r.productId, {
        productId: r.productId,
        name: r.product.name,
        code: r.product.code,
        total: r.quantity,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

// ─────────────────────────────────────────────
// Toplam Aylık Fire
// ─────────────────────────────────────────────
export async function getMonthlyFireTotal(year: number, month: number): Promise<number> {
  await requireAuth();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const result = await prisma.fireRecord.aggregate({
    where: { date: { gte: start, lte: end } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

// ─────────────────────────────────────────────
// Tüm geçmiş kayıtlar (sayfalı)
// ─────────────────────────────────────────────
export async function getAllFireRecords(page = 1, pageSize = 50) {
  await requireAuth();
  const skip = (page - 1) * pageSize;
  const [records, total] = await Promise.all([
    prisma.fireRecord.findMany({
      include: { product: { select: { id: true, name: true, code: true } } },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.fireRecord.count(),
  ]);
  return { records, total, page, pageSize };
}

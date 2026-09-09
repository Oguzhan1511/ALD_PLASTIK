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
// Fire Kayıtları — Tarih aralıklı
// ─────────────────────────────────────────────
export async function getFireRecords(start: Date, end: Date, limit?: number) {
  await requireAuth();

  return prisma.fireRecord.findMany({
    where: { date: { gte: start, lte: end } },
    include: { product: { select: { id: true, name: true, code: true } } },
    orderBy: { date: "desc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────
// Ürün Bazında Fire Özeti (Tarih aralıklı)
// ─────────────────────────────────────────────
export async function getFireSummaryByProduct(start: Date, end: Date) {
  await requireAuth();

  // O aya ait fire ve üretim kayıtlarını eş zamanlı çekiyoruz
  const [fireRecords, prodRecords] = await Promise.all([
    prisma.fireRecord.findMany({
      where: { date: { gte: start, lte: end } },
      include: { product: { select: { id: true, name: true, code: true } } },
    }),
    prisma.productionRecord.groupBy({
      by: ["productId"],
      where: { date: { gte: start, lte: end } },
      _sum: { quantity: true },
    }),
  ]);

  // Üretim miktarlarını map'e alalım hızlı arama için
  const prodMap = new Map<string, number>();
  for (const p of prodRecords) {
    prodMap.set(p.productId, p._sum.quantity ?? 0);
  }

  // Ürün bazında topla
  const map = new Map<string, { productId: string; name: string; code: string | null; fireTotal: number; productionTotal: number; percentage: number }>();
  for (const r of fireRecords) {
    const existing = map.get(r.productId);
    if (existing) {
      existing.fireTotal += r.quantity;
    } else {
      map.set(r.productId, {
        productId: r.productId,
        name: r.product.name,
        code: r.product.code,
        fireTotal: r.quantity,
        productionTotal: 0,
        percentage: 0,
      });
    }
  }

  // Üretim toplamını ve yüzdeyi hesapla
  const result = Array.from(map.values()).map(item => {
    const prodTotal = prodMap.get(item.productId) ?? 0;
    // Toplam üretim = sağlam üretim (prodTotal) + fire (fireTotal)
    const grossTotal = prodTotal + item.fireTotal;
    const percentage = grossTotal > 0 ? (item.fireTotal / grossTotal) * 100 : 0;
    
    return {
      ...item,
      productionTotal: prodTotal,
      percentage,
    };
  });

  return result.sort((a, b) => b.fireTotal - a.fireTotal);
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

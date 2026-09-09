"use server";

import { prisma } from "../prisma";
import { PRODUCT_CYCLES } from "../utils/product-cycles";
import { revalidatePath } from "next/cache";

export type ProductCycleItem = {
  code: string | null;
  name: string;
  cavity: number | null;
  cycle: number | null;
  isOverridden: boolean;
  hasDefault: boolean; // PRODUCT_CYCLES listesinde var mı
};

// Tüm ürünleri (override edilmiş değerleriyle birlikte) getir
export async function getProductCycles(): Promise<ProductCycleItem[]> {
  const [overrides, allProducts] = await Promise.all([
    prisma.productCycleOverride.findMany(),
    prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    }),
  ]);

  const overrideMap = new Map(overrides.map((o) => [o.code, o]));
  const cycleMap = new Map(PRODUCT_CYCLES.map((c) => [c.code, c]));

  return allProducts.map((p) => {
    const code = p.code ?? null;
    const baseInfo = code ? cycleMap.get(code) : undefined;
    const override = code ? overrideMap.get(code) : undefined;
    return {
      code,
      name: p.name,
      cavity: override ? override.cavity : (baseInfo?.cavity ?? null),
      cycle: override ? override.cycle : (baseInfo?.cycle ?? null),
      isOverridden: !!override,
      hasDefault: !!baseInfo,
    };
  });
}

// Sadece override'ları getir (client-side süre hesabı için)
export async function getProductCycleOverrides(): Promise<Record<string, { cavity: number; cycle: number }>> {
  const overrides = await prisma.productCycleOverride.findMany();
  return Object.fromEntries(overrides.map((o) => [o.code, { cavity: o.cavity, cycle: o.cycle }]));
}

// Bir ürün için override ekle veya güncelle
export async function upsertProductCycleOverride(
  code: string,
  cavity: number,
  cycle: number
) {
  await prisma.productCycleOverride.upsert({
    where: { code },
    create: { code, cavity, cycle },
    update: { cavity, cycle },
  });
  revalidatePath("/is-takibi");
}

// Bir ürünün override'ını sil (varsayılana döner)
export async function deleteProductCycleOverride(code: string) {
  await prisma.productCycleOverride.deleteMany({ where: { code } });
  revalidatePath("/is-takibi");
}

// Tüm override'ları sil
export async function deleteAllProductCycleOverrides() {
  await prisma.productCycleOverride.deleteMany();
  revalidatePath("/is-takibi");
}

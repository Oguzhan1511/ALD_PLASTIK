"use server";

import { prisma } from "../prisma";
import { PRODUCT_CYCLES } from "../utils/product-cycles";
import { revalidatePath } from "next/cache";

export type ProductCycleItem = {
  code: string;
  name: string;
  cavity: number;
  cycle: number;
  isOverridden: boolean;
};

// Tüm ürünleri (override edilmiş değerleriyle birlikte) getir
export async function getProductCycles(): Promise<ProductCycleItem[]> {
  const overrides = await prisma.productCycleOverride.findMany();
  const overrideMap = new Map(overrides.map((o) => [o.code, o]));

  return PRODUCT_CYCLES.map((item) => {
    const override = overrideMap.get(item.code);
    return {
      code: item.code,
      name: item.name,
      cavity: override ? override.cavity : item.cavity,
      cycle: override ? override.cycle : item.cycle,
      isOverridden: !!override,
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

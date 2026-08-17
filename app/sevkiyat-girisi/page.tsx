import { getRawMaterials } from "@/lib/actions/hammadde";
import { getProducts } from "@/lib/actions/urun";
import { getRecentSevkiyatGirisleri } from "@/lib/actions/sevkiyat-girisi";
import { SevkiyatGirisiClient } from "@/components/sevkiyat/SevkiyatGirisiClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sevkiyat Girişi — ALD Plastik",
  description: "Dışarıdan gelen iadeler ve mamül girişleri.",
};

export default async function SevkiyatGirisiPage() {
  const [rawMaterials, products, recentEntries] = await Promise.all([
    getRawMaterials(),
    getProducts(),
    getRecentSevkiyatGirisleri(30),
  ]);

  const serializedRawMaterials = JSON.parse(JSON.stringify(rawMaterials));
  const serializedProducts = JSON.parse(JSON.stringify(products));
  const serializedRecentEntries = JSON.parse(JSON.stringify(recentEntries));

  return (
    <SevkiyatGirisiClient 
      rawMaterials={serializedRawMaterials} 
      products={serializedProducts} 
      recentEntries={serializedRecentEntries} 
    />
  );
}

import { getProducts } from "@/lib/actions/urun";
import { SevkiyatClient } from "@/components/sevkiyat/SevkiyatClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sevkiyat Çıkışı — ALD Plastik",
  description: "Ürün ve grup sevkiyatı yapın.",
};

export const dynamic = 'force-dynamic';

export default async function SevkiyatPage() {
  const products = await getProducts();
  const serializedProducts = JSON.parse(JSON.stringify(products));

  return (
    <SevkiyatClient
      products={serializedProducts}
    />
  );
}

import { PendingFormClient } from "@/components/pending/PendingFormClient";
import { getActiveProducts, getActiveRawMaterials, getRecentPendingEntries } from "@/lib/actions/pending";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sevkiyat Çıkış Bildirimi",
  description: "Usta sevkiyat kayıt formu",
  robots: { index: false, follow: false },
};

export default async function UstaSevkiyatPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  if (resolvedParams.token !== process.env.USTA_SEVKIYAT_TOKEN) {
    notFound();
  }

  const products = await getActiveProducts();
  const rawMaterials = await getActiveRawMaterials();
  const recentEntries = await getRecentPendingEntries(["SEVKIYAT", "SEVKIYAT_GIRISI", "SEVKIYAT_CIKISI"], 20);

  const serializedEntries = recentEntries.map(entry => ({
    ...entry,
    quantity: entry.quantity.toNumber(),
    submittedAt: entry.submittedAt.toISOString(),
    reviewedAt: entry.reviewedAt ? entry.reviewedAt.toISOString() : null,
    product: entry.product ? {
      id: entry.product.id,
      name: entry.product.name,
      code: entry.product.code,
    } : null,
    rawMaterial: entry.rawMaterial ? {
      id: entry.rawMaterial.id,
      name: entry.rawMaterial.name,
      code: entry.rawMaterial.code,
      unit: entry.rawMaterial.unit,
    } : null,
  }));

  return (
    <PendingFormClient
      type="SEVKIYAT"
      products={products}
      rawMaterials={rawMaterials}
      title="Sevkiyat Bildirimi"
      recentEntries={serializedEntries}
    />
  );
}

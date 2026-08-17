import { PendingFormClient } from "@/components/pending/PendingFormClient";
import { getActiveProducts, getRecentPendingEntries } from "@/lib/actions/pending";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Üretim Bildirimi",
  description: "Usta üretim kayıt formu",
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function UstaUretimPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  if (resolvedParams.token !== process.env.USTA_URETIM_TOKEN) {
    notFound();
  }

  const products = await getActiveProducts();
  const recentEntries = await getRecentPendingEntries(["URETIM"], 20);

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
      type="URETIM"
      products={products}
      title="Üretim Bildirimi"
      recentEntries={serializedEntries}
    />
  );
}

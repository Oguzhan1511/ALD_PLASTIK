import { RaporlarClient } from "@/components/raporlar/RaporlarClient";
import { getPendingEntries } from "@/lib/actions/pending";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raporlar & Onaylar",
  description: "Usta üretim ve sevkiyat bildirim onayları",
};

export default async function RaporlarPage() {
  const pendingEntries = await getPendingEntries("BEKLIYOR");
  const approvedEntries = await getPendingEntries("ONAYLANDI");
  const rejectedEntries = await getPendingEntries("REDDEDILDI");

  const serializeEntry = (entry: any) => ({
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
  });

  return (
    <RaporlarClient
      pendingEntries={pendingEntries.map(serializeEntry)}
      approvedEntries={approvedEntries.map(serializeEntry)}
      rejectedEntries={rejectedEntries.map(serializeEntry)}
      uretimToken={process.env.USTA_URETIM_TOKEN || ""}
      sevkiyatToken={process.env.USTA_SEVKIYAT_TOKEN || ""}
    />
  );
}

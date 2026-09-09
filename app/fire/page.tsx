import { getFireRecords, getFireSummaryByProduct } from "@/lib/actions/fire";
import { FireClient } from "@/components/fire/FireClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fire Takibi — ALD Plastik",
  description: "Üretim sırasında oluşan firelerin takibi.",
};

export const dynamic = 'force-dynamic';

export default async function FirePage({ searchParams }: { searchParams: { start?: string, end?: string } }) {
  const today = new Date();
  
  // Default to current month if not provided
  let startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  if (searchParams.start) {
    startDate = new Date(searchParams.start);
    startDate.setHours(0, 0, 0, 0);
  }
  
  if (searchParams.end) {
    endDate = new Date(searchParams.end);
    endDate.setHours(23, 59, 59, 999);
  }

  const [records, summary] = await Promise.all([
    getFireRecords(startDate, endDate),
    getFireSummaryByProduct(startDate, endDate),
  ]);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const serializedRecords = JSON.parse(JSON.stringify(records));
  const serializedSummary = JSON.parse(JSON.stringify(summary));

  return (
    <FireClient
      initialRecords={serializedRecords}
      summary={serializedSummary}
      startDate={startStr}
      endDate={endStr}
    />
  );
}

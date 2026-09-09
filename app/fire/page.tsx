import { getFireRecords, getFireSummaryByProduct } from "@/lib/actions/fire";
import { FireClient } from "@/components/fire/FireClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fire Takibi — ALD Plastik",
  description: "Üretim sırasında oluşan firelerin takibi.",
};

export const dynamic = 'force-dynamic';

export default async function FirePage({ searchParams }: { searchParams: { m?: string, y?: string } }) {
  const date = new Date();
  const currentMonth = searchParams.m ? parseInt(searchParams.m) : date.getMonth() + 1;
  const currentYear = searchParams.y ? parseInt(searchParams.y) : date.getFullYear();

  const [records, summary] = await Promise.all([
    getFireRecords(currentYear, currentMonth),
    getFireSummaryByProduct(currentYear, currentMonth),
  ]);

  return (
    <FireClient
      initialRecords={records}
      summary={summary}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  );
}

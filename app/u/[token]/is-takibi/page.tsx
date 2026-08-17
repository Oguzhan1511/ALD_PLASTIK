import { getWeeklyJobSchedules } from "@/lib/actions/is-takibi";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UstaWeeklyScheduleClient } from "@/components/is-takibi/UstaWeeklyScheduleClient";

export const metadata: Metadata = {
  title: "Haftalık İş Planı",
  description: "Usta haftalık iş planı ekranı",
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function UstaIsTakibiPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  if (resolvedParams.token !== process.env.USTA_IS_TAKIBI_TOKEN) {
    notFound();
  }

  // Bu haftanın başı (Pazartesi) ve sonu (Pazar)
  const now = new Date();
  const day = now.getDay() || 7; // 1-7 (Pazartesi-Pazar)
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day + 1);
  const startDateStr = startOfWeek.toISOString().split('T')[0];

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const endDateStr = endOfWeek.toISOString().split('T')[0];

  const schedules = await getWeeklyJobSchedules(startDateStr, endDateStr);

  // Prisma tarih nesnelerini serileştir
  const serializedSchedules = schedules.map(s => ({
    ...s,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    expectedQty: s.expectedQty ? s.expectedQty.toNumber() : null,
  }));

  return (
    <UstaWeeklyScheduleClient
      initialStartDate={startDateStr}
      initialEndDate={endDateStr}
      initialSchedules={serializedSchedules}
      token={resolvedParams.token}
    />
  );
}

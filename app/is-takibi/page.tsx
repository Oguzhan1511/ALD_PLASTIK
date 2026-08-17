import { getMachines, getJobSchedules, getProductsAndRawMaterials } from "@/lib/actions/is-takibi";
import IsTakibiClient from "@/components/is-takibi/IsTakibiClient";

export const dynamic = 'force-dynamic';

export default async function IsTakibiPage() {
  const [machines, { products, rawMaterials }] = await Promise.all([
    getMachines(),
    getProductsAndRawMaterials(),
  ]);

  // Bugünü YYYY-MM-DD formatında alıyoruz (Türkiye saatine göre UTC+3)
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const today = turkeyTime.toISOString().split("T")[0];
  
  const initialSchedules = await getJobSchedules(today);
  
  const { getUstaIsTakibiToken } = await import("@/lib/actions/is-takibi");
  const ustaToken = await getUstaIsTakibiToken();

  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-gray-50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İş Takibi (Üretim Planlama)</h1>
          <p className="text-sm text-gray-500 mt-1">Makinelerin günlük üretim planlarını yönetin.</p>
        </div>
      </div>

      <IsTakibiClient 
        machines={machines} 
        products={products}
        rawMaterials={rawMaterials}
        initialDate={today}
        initialSchedules={initialSchedules}
        ustaToken={ustaToken}
      />
    </div>
  );
}

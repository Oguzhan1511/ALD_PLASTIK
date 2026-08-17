import { getMachines, getJobSchedules, getProductsAndRawMaterials } from "@/lib/actions/is-takibi";
import IsTakibiClient from "@/components/is-takibi/IsTakibiClient";

export const dynamic = 'force-dynamic';

export default async function IsTakibiPage() {
  const [machines, { products, rawMaterials }] = await Promise.all([
    getMachines(),
    getProductsAndRawMaterials(),
  ]);

  // Bugünü YYYY-MM-DD formatında alıyoruz
  const today = new Date().toISOString().split("T")[0];
  const initialSchedules = await getJobSchedules(today);

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
      />
    </div>
  );
}

import { getProducts } from "@/lib/actions/urun";
import { getProductionRecords } from "@/lib/actions/uretim";
import { UretimClient } from "@/components/uretim/UretimClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Üretim Girişi — ALD Plastik",
  description: "Üretim kaydı girin, stok otomatik düşülür.",
};

export const dynamic = 'force-dynamic';

export default async function UretimPage() {
  try {
    const [products, recentProductions] = await Promise.all([
      getProducts(),
      getProductionRecords(20),
    ]);

    const serializedProducts = JSON.parse(JSON.stringify(products));
    const serializedProductions = JSON.parse(JSON.stringify(recentProductions));

    return (
      <UretimClient
        products={serializedProducts}
        recentProductions={serializedProductions}
      />
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-red-600 bg-red-50 border border-red-200 rounded-md m-8">
        <h2 className="text-lg font-bold mb-2">Sayfa Yüklenirken Hata Oluştu (Üretim)</h2>
        <pre className="whitespace-pre-wrap text-sm">{error?.message || String(error)}</pre>
        {error?.stack && <pre className="whitespace-pre-wrap text-xs mt-4 text-red-400">{error.stack}</pre>}
      </div>
    );
  }
}

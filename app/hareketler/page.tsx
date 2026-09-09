import { getStockMovements } from "@/lib/actions/hareket";
import { getRawMaterials } from "@/lib/actions/hammadde";
import { getProducts } from "@/lib/actions/urun";
import { getProductStockMovementsPaginated } from "@/lib/actions/urun-stok";
import { HareketiClient } from "@/components/hareketler/HareketiClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hareket Geçmişi — ALD Plastik",
  description: "Tüm stok giriş-çıkış hareketlerinin tarih sıralı, filtrelenebilir dökümü.",
};

export const dynamic = 'force-dynamic';

export default async function HareketiPage() {
  try {
    const [
      { movements: hammaddeMovements, total: hTotal, totalPages: hTotalPages },
      { movements: urunMovements, total: uTotal, totalPages: uTotalPages },
      rawMaterials,
      products,
    ] = await Promise.all([
      getStockMovements({ page: 1, pageSize: 20 }),
      getProductStockMovementsPaginated({ page: 1, pageSize: 20 }),
      getRawMaterials(),
      getProducts(),
    ]);

    const serializedHammaddeMovements = JSON.parse(JSON.stringify(hammaddeMovements));
    const serializedUrunMovements = JSON.parse(JSON.stringify(urunMovements));
    const serializedRawMaterials = JSON.parse(JSON.stringify(rawMaterials));
    const serializedProducts = JSON.parse(JSON.stringify(products));

    return (
      <HareketiClient
        initialHammaddeMovements={serializedHammaddeMovements}
        hTotal={hTotal}
        hTotalPages={hTotalPages}
        rawMaterials={serializedRawMaterials}
        
        initialUrunMovements={serializedUrunMovements}
        uTotal={uTotal}
        uTotalPages={uTotalPages}
        products={serializedProducts}
      />
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-red-600 bg-red-50 border border-red-200 rounded-md m-8">
        <h2 className="text-lg font-bold mb-2">Sayfa Yüklenirken Hata Oluştu (Hareketler)</h2>
        <pre className="whitespace-pre-wrap text-sm">{error?.message || String(error)}</pre>
        {error?.stack && <pre className="whitespace-pre-wrap text-xs mt-4 text-red-400">{error.stack}</pre>}
      </div>
    );
  }
}

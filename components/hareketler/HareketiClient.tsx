"use client";

import { useState, useTransition, useCallback, Fragment } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { getStockMovements, getStockCard, MovementFilters, MovementType } from "@/lib/actions/hareket";
import { getProductStockMovementsPaginated, ProductMovementFilters } from "@/lib/actions/urun-stok";
import { cancelProductionRecord } from "@/lib/actions/uretim";
import { cancelShipmentRecord } from "@/lib/actions/sevkiyat";

interface Movement {
  id: string;
  type: MovementType;
  amount: number | string;
  date: Date | string;
  description: string | null;
  rawMaterial: { id: string; name: string; unit: string };
  productionRecord: { id: string; product: { name: string } } | null;
}

interface UrunMovement {
  id: string;
  type: string;
  quantity: number | string;
  date: Date | string;
  description: string | null;
  product: { id: string; name: string; code: string | null };
  productionRecord: { 
    id: string; 
    productStockMovements?: {
      id: string;
      type: string;
      quantity: number | string;
      date: Date | string;
      description: string | null;
      product: { name: string; code: string | null };
    }[];
  } | null;
  shipmentRecord: { 
    id: string; 
    type: string; 
    quantity?: number | string; 
    date?: Date | string;
    description?: string | null;
    shipmentGroup: { name: string; code: string | null } | null;
    productStockMovements?: any[];
  } | null;
}

interface HareketiClientProps {
  initialHammaddeMovements: Movement[];
  hTotal: number;
  hTotalPages: number;
  rawMaterials: { id: string; name: string; unit: string; currentStock: any; criticalLevel: any }[];
  
  initialUrunMovements: UrunMovement[];
  uTotal: number;
  uTotalPages: number;
  products: { id: string; name: string; code: string | null; currentStock: any; criticalLevel: any }[];
}

const H_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  GIRIS: { label: "Giriş", className: "badge-green" },
  SEVKIYAT_GIRISI: { label: "Sevkiyat Girişi", className: "badge-green" },
  URETIM_CIKISI: { label: "Üretim Çıkışı", className: "badge-red" },
  MANUEL_CIKIS: { label: "Manuel Çıkış", className: "badge-orange" },
  DUZELTME: { label: "Düzeltme", className: "badge-slate" },
  SEVKIYAT_CIKISI: { label: "Sevkiyat Çıkışı", className: "badge-red" },
  URETIM_IPTALI: { label: "Üretim İptali", className: "badge-slate" },
};

const U_TYPE_LABELS: Record<string, { label: string; className: string; sign: string; color: string }> = {
  URETIM_GIRISI: { label: "Üretim Girişi", className: "badge-blue", sign: "+", color: "text-blue-600" },
  SEVKIYAT_GIRISI: { label: "Sevkiyat Girişi", className: "badge-green", sign: "+", color: "text-green-600" },
  ALT_MONTAJ_CIKISI: { label: "Alt Montaj Çıkışı", className: "badge-orange", sign: "-", color: "text-orange-600" },
  SATIS_CIKISI:  { label: "Satış Çıkışı",  className: "badge-red",  sign: "-", color: "text-red-600"  },
  SEVKIYAT_CIKISI:{ label: "Sevkiyat Çıkışı", className: "badge-red", sign: "-", color: "text-red-600" },
  MANUEL_GIRIS:  { label: "Manuel Giriş",  className: "badge-green", sign: "+", color: "text-green-600" },
  MANUEL_CIKIS:  { label: "Manuel Çıkış",  className: "badge-orange", sign: "-", color: "text-orange-600" },
  DUZELTME:      { label: "Düzeltme",      className: "badge-slate", sign: "±", color: "text-slate-600" },
  URETIM_IPTALI: { label: "Üretim İptali", className: "badge-red", color: "text-red-600", sign: "-" },
  SEVKIYAT_IPTALI: { label: "Sevkiyat İptali", className: "badge-red", color: "text-red-600", sign: "+" },
  GRUP_SEVKIYAT_CIKISI: { label: "Grup Sevkiyat Çıkışı", className: "badge-red", color: "text-red-600", sign: "-" },
};

// İptal edilebilir hammadde hareket tipleri
const CANCELLABLE_H_TYPES = ["URETIM_CIKISI", "SEVKIYAT_CIKISI", "GIRIS", "SEVKIYAT_GIRISI"];
// İptal edilebilir ürün hareket tipleri
const CANCELLABLE_U_TYPES = ["URETIM_GIRISI", "SEVKIYAT_CIKISI"];

export function HareketiClient({
  initialHammaddeMovements,
  hTotal,
  hTotalPages,
  rawMaterials,
  initialUrunMovements,
  uTotal,
  uTotalPages,
  products,
}: HareketiClientProps) {
  const [activeTab, setActiveTab] = useState<"hammadde" | "urun" | "sevkiyat">("hammadde");

  // Hammadde state
  const [hMovements, setHMovements] = useState<Movement[]>(initialHammaddeMovements);
  const [hTotalCount, setHTotalCount] = useState(hTotal);
  const [hPages, setHPages] = useState(hTotalPages);
  const [hPage, setHPage] = useState(1);
  const [hFilterMaterial, setHFilterMaterial] = useState("");
  const [hFilterType, setHFilterType] = useState("");
  const [hFilterStart, setHFilterStart] = useState("");
  const [hFilterEnd, setHFilterEnd] = useState("");

  // Ürün state
  const [uMovements, setUMovements] = useState<UrunMovement[]>(initialUrunMovements);
  const [uTotalCount, setUTotalCount] = useState(uTotal);
  const [uPages, setUPages] = useState(uTotalPages);
  const [uPage, setUPage] = useState(1);
  const [uFilterProduct, setUFilterProduct] = useState("");
  const [uPrimaryFilter, setUPrimaryFilter] = useState<"ALL" | "URETIM" | "SEVKIYAT">("ALL");
  const [uSecondaryUretim, setUSecondaryUretim] = useState<"ALL" | "URETIM_GIRISI">("ALL");
  const [uFilterStart, setUFilterStart] = useState("");
  const [uFilterEnd, setUFilterEnd] = useState("");

  const [stockCardData, setStockCardData] = useState<any>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // ── İptal modu state ──
  const [hCancelMode, setHCancelMode] = useState(false);
  const [hSelectedIds, setHSelectedIds] = useState<Set<string>>(new Set());
  const [uCancelMode, setUCancelMode] = useState(false);
  const [uSelectedIds, setUSelectedIds] = useState<Set<string>>(new Set());
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  // Alt montaj satırlarını açmak için
  const [expandedProductionIds, setExpandedProductionIds] = useState<Set<string>>(new Set());
  // Grup sevkiyatı alt satırlarını açmak için
  const [expandedShipmentIds, setExpandedShipmentIds] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProductionExpand = (productionId: string) => {
    setExpandedProductionIds(prev => {
      const next = new Set(prev);
      next.has(productionId) ? next.delete(productionId) : next.add(productionId);
      return next;
    });
  };

  const toggleShipmentExpand = (shipmentId: string) => {
    setExpandedShipmentIds(prev => {
      const next = new Set(prev);
      next.has(shipmentId) ? next.delete(shipmentId) : next.add(shipmentId);
      return next;
    });
  };

  const fetchHMovements = useCallback(
    (newPage: number, filters?: MovementFilters) => {
      startTransition(async () => {
        const f = filters ?? {
          searchQuery: hFilterMaterial || undefined,
          type: (hFilterType as MovementType) || undefined,
          startDate: hFilterStart || undefined,
          endDate: hFilterEnd || undefined,
        };
        const res = await getStockMovements({ ...f, page: newPage, pageSize: 20 });
        setHMovements(res.movements as any);
        setHTotalCount(res.total);
        setHPages(res.totalPages);
        setHPage(newPage);
      });
    },
    [hFilterMaterial, hFilterType, hFilterStart, hFilterEnd]
  );

  const fetchUMovements = useCallback(
    (newPage: number, filters?: ProductMovementFilters) => {
      startTransition(async () => {
        let calculatedType: string | string[] | undefined = undefined;
        let calculatedShipmentType: "TEKIL_URUN" | "GRUP" | undefined = undefined;

        if (uPrimaryFilter === "URETIM") {
          calculatedType = ["URETIM_GIRISI"];
        } else if (uPrimaryFilter === "SEVKIYAT") {
          calculatedType = ["SEVKIYAT_GIRISI", "SEVKIYAT_CIKISI", "GRUP_SEVKIYAT_CIKISI"];
        } else if (uPrimaryFilter === "ALL") {
          // Exclude ALT_MONTAJ_CIKISI and SEVKIYAT_ALT_CIKISI explicitly when ALL is selected
          calculatedType = ["URETIM_GIRISI", "SEVKIYAT_GIRISI", "SEVKIYAT_CIKISI", "GRUP_SEVKIYAT_CIKISI", "SATIS_CIKISI", "MANUEL_GIRIS", "MANUEL_CIKIS", "DUZELTME", "URETIM_IPTALI", "SEVKIYAT_IPTALI"];
        }

        const f = filters ?? {
          searchQuery: uFilterProduct || undefined,
          type: calculatedType,
          shipmentType: calculatedShipmentType,
          startDate: uFilterStart || undefined,
          endDate: uFilterEnd || undefined,
        };
        const res = await getProductStockMovementsPaginated({ ...f, page: newPage, pageSize: 20 });
        setUMovements(res.movements as any);
        setUTotalCount(res.total);
        setUPages(res.totalPages);
        setUPage(newPage);
      });
    },
    [uFilterProduct, uPrimaryFilter, uSecondaryUretim, uFilterStart, uFilterEnd]
  );

  const handleHFilter = () => fetchHMovements(1);
  const handleUFilter = () => { fetchUMovements(1); };

  const handleHPageChange = (p: number) => fetchHMovements(p);
  const handleUPageChange = (p: number) => fetchUMovements(p);

  const handleOpenStockCard = (materialId: string) => {
    startTransition(async () => {
      const data = await getStockCard(materialId);
      setStockCardData(data);
      setIsCardOpen(true);
    });
  };

  const cardMovements = stockCardData?.movements ?? [];
  const cardMaterial = stockCardData?.rawMaterial;

  const handleUPrimaryFilterChange = (val: "ALL" | "URETIM" | "SEVKIYAT") => {
    setUPrimaryFilter(val);
    let calculatedType: string | string[] | undefined = undefined;
    
    if (val === "URETIM") {
      calculatedType = ["URETIM_GIRISI"];
    } else if (val === "SEVKIYAT") {
      calculatedType = ["SEVKIYAT_GIRISI", "SEVKIYAT_CIKISI", "GRUP_SEVKIYAT_CIKISI"];
    } else if (val === "ALL") {
      calculatedType = ["URETIM_GIRISI", "SEVKIYAT_GIRISI", "SEVKIYAT_CIKISI", "GRUP_SEVKIYAT_CIKISI", "SATIS_CIKISI", "MANUEL_GIRIS", "MANUEL_CIKIS", "DUZELTME", "URETIM_IPTALI", "SEVKIYAT_IPTALI"];
    }
    
    fetchUMovements(1, {
      searchQuery: uFilterProduct || undefined,
      type: calculatedType,
      startDate: uFilterStart || undefined,
      endDate: uFilterEnd || undefined,
    });
  };

  // ── Hammadde iptal seçim toggle ──
  const toggleHSelect = (id: string) => {
    setHSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Ürün iptal seçim toggle ──
  const toggleUSelect = (id: string) => {
    setUSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Hammadde seçili hareketleri iptal et ──
  const handleHCancel = () => {
    if (hSelectedIds.size === 0) return;
    // Seçili hareketlerin productionRecordId'lerini topla
    const selected = hMovements.filter(m => hSelectedIds.has(m.id));
    const productionIds = [...new Set(selected.map(m => m.productionRecord?.id).filter(Boolean))] as string[];
    
    if (productionIds.length === 0) {
      setCancelError("Seçili hareketler iptal edilemiyor. Sadece üretimden kaynaklanan hareketler iptal edilebilir.");
      return;
    }

    if (!confirm(`${productionIds.length} üretim kaydı iptal edilecek. Tüm stoklar geri alınacak. Emin misiniz?`)) return;

    setCancelError(null);
    setCancelSuccess(null);
    startTransition(async () => {
      try {
        for (const pid of productionIds) {
          await cancelProductionRecord(pid);
        }
        setCancelSuccess(`${productionIds.length} üretim kaydı başarıyla iptal edildi.`);
        setHCancelMode(false);
        setHSelectedIds(new Set());
        fetchHMovements(hPage);
      } catch (e: any) {
        setCancelError(e.message);
      }
    });
  };

  // ── Ürün seçili hareketleri iptal et ──
  const handleUCancel = () => {
    if (uSelectedIds.size === 0) return;
    const selected = uMovements.filter(m => uSelectedIds.has(m.id));
    
    // Üretim iptali
    const productionIds = [...new Set(
      selected.filter(m => m.type === "URETIM_GIRISI")
        .map(m => m.productionRecord?.id).filter(Boolean)
    )] as string[];
    
    // Sevkiyat iptali
    const shipmentIds = [...new Set(
      selected.filter(m => m.type === "SEVKIYAT_CIKISI")
        .map(m => m.shipmentRecord?.id).filter(Boolean)
    )] as string[];

    const totalOps = productionIds.length + shipmentIds.length;
    if (totalOps === 0) {
      setCancelError("Seçili hareketler iptal edilemiyor. Sadece üretim ve sevkiyat hareketleri iptal edilebilir.");
      return;
    }

    if (!confirm(`${totalOps} kayıt iptal edilecek. Tüm stoklar geri alınacak. Emin misiniz?`)) return;

    setCancelError(null);
    setCancelSuccess(null);
    startTransition(async () => {
      try {
        for (const pid of productionIds) {
          await cancelProductionRecord(pid);
        }
        for (const sid of shipmentIds) {
          await cancelShipmentRecord(sid);
        }
        setCancelSuccess(`${totalOps} kayıt başarıyla iptal edildi.`);
        setUCancelMode(false);
        setUSelectedIds(new Set());
        fetchUMovements(uPage);
      } catch (e: any) {
        setCancelError(e.message);
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Hareket Geçmişi</h1>
        <div className="flex flex-col sm:flex-row flex-wrap bg-slate-100 p-1 rounded-lg w-full sm:w-auto mt-4 sm:mt-0">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "hammadde" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("hammadde")}
          >
            Hammadde Hareketleri
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "urun" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("urun")}
          >
            Ürün Hareketleri
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* HAMMADDE TAB */}
        {activeTab === "hammadde" && (
          <>
            <div className="card mb-6">
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label text-xs">Hammadde Arama (Ad / Kod)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Hammadde adı veya kodu..."
                      value={hFilterMaterial}
                      onChange={(e) => setHFilterMaterial(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">Hareket Tipi</label>
                    <select
                      className="form-select"
                      value={hFilterType}
                      onChange={(e) => setHFilterType(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      <option value="GIRIS">Giriş</option>
                      <option value="URETIM_CIKISI">Üretim Çıkışı</option>
                      <option value="MANUEL_CIKIS">Manuel Çıkış</option>
                      <option value="DUZELTME">Düzeltme</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={hFilterStart}
                      onChange={(e) => setHFilterStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">Bitiş Tarihi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={hFilterEnd}
                      onChange={(e) => setHFilterEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button className="btn btn-primary w-full sm:w-auto justify-center" onClick={handleHFilter} disabled={isPending}>
                    {isPending ? "Yükleniyor..." : "Filtrele"}
                  </button>
                  <button
                    className="btn btn-secondary w-full sm:w-auto justify-center"
                    onClick={() => {
                      setHFilterMaterial("");
                      setHFilterType("");
                      setHFilterStart("");
                      setHFilterEnd("");
                      fetchHMovements(1, {});
                    }}
                  >
                    Sıfırla
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-700">Hammadde Stok Hareketleri</h2>
                  <span className="text-sm text-slate-400">{hTotalCount} kayıt</span>
                </div>
                <div className="flex items-center gap-2">
                  {hCancelMode ? (
                    <>
                      <span className="text-sm text-slate-500">{hSelectedIds.size} seçili</span>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={hSelectedIds.size === 0 || isPending}
                        onClick={handleHCancel}
                      >
                        {isPending ? "İptal ediliyor..." : `Seçilenleri İptal Et`}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setHCancelMode(false); setHSelectedIds(new Set()); setCancelError(null); }}
                      >
                        Vazgeç
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm flex items-center gap-1.5"
                      onClick={() => { setHCancelMode(true); setCancelError(null); setCancelSuccess(null); }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      İptal Et
                    </button>
                  )}
                </div>
              </div>

              {cancelError && activeTab === "hammadde" && (
                <div className="alert-error mx-4 mt-4">{cancelError}</div>
              )}
              {cancelSuccess && activeTab === "hammadde" && (
                <div className="alert-success mx-4 mt-4">{cancelSuccess}</div>
              )}
              {hCancelMode && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-700 text-sm">
                  ⚠️ İptal modundasınız. Sadece <strong>üretimden kaynaklanan</strong> hareketler iptal edilebilir. Hareketleri seçip "Seçilenleri İptal Et"e tıklayın.
                </div>
              )}

              <div className="table-wrapper border-0 rounded-t-none">
                {hMovements.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-slate-400 text-sm">Hareket kaydı bulunamadı.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        {hCancelMode && <th className="w-10"></th>}
                        <th>Tarih</th>
                        <th>Hammadde</th>
                        <th>Tip</th>
                        <th>Miktar</th>
                        <th>Açıklama</th>
                        <th>İlgili Üretim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hMovements.map((m) => {
                        const typeInfo = H_TYPE_LABELS[m.type];
                        const amount = parseFloat(m.amount.toString());
                        const isCancellable = hCancelMode && CANCELLABLE_H_TYPES.includes(m.type) && !!m.productionRecord;
                        const isSelected = hSelectedIds.has(m.id);
                        return (
                          <tr
                            key={m.id}
                            className={`${hCancelMode && isCancellable ? "cursor-pointer hover:bg-amber-50" : ""} ${isSelected ? "bg-amber-100" : ""}`}
                            onClick={() => { if (isCancellable) toggleHSelect(m.id); }}
                          >
                            {hCancelMode && (
                              <td onClick={e => e.stopPropagation()}>
                                {isCancellable ? (
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded accent-red-600"
                                    checked={isSelected}
                                    onChange={() => toggleHSelect(m.id)}
                                  />
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                            )}
                            <td className="text-slate-500 text-sm whitespace-nowrap">
                              {new Date(m.date).toLocaleString("tr-TR", {
                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td>
                              <button
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                onClick={(e) => { e.stopPropagation(); handleOpenStockCard(m.rawMaterial.id); }}
                              >
                                {m.rawMaterial.name}
                              </button>
                            </td>
                            <td>
                              <span className={typeInfo?.className || "badge-slate"}>{typeInfo?.label || m.type}</span>
                            </td>
                            <td className="font-semibold text-slate-700">
                              {(m.type === "GIRIS" || m.type === "SEVKIYAT_GIRISI") ? "+" : "-"}
                              {Math.abs(amount).toLocaleString("tr-TR", { maximumFractionDigits: 5 })} {m.rawMaterial.unit}
                            </td>
                            <td className="text-slate-500 text-sm">{m.description || "—"}</td>
                            <td className="text-sm text-slate-500">
                              {m.productionRecord ? (
                                <span className="badge-blue cursor-default" title={`Üretim ID: ${m.productionRecord.id}`}>
                                  {m.productionRecord.product.name}
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {hPages > 1 && (
                <div className="px-6 pb-4">
                  <Pagination currentPage={hPage} totalPages={hPages} onPageChange={handleHPageChange} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ÜRÜN TAB */}
        {activeTab === "urun" && (
          <>
            <div className="card mb-6">
              <div className="card-body">
                <div className="space-y-4">
                  {/* Primary Filter Tabs */}
                  <div className="flex flex-col sm:flex-row flex-wrap bg-slate-100 p-1 rounded-lg w-full lg:w-max">
                    <button
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        uPrimaryFilter === "ALL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                      onClick={() => handleUPrimaryFilterChange("ALL")}
                    >
                      Tümü
                    </button>
                    <button
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        uPrimaryFilter === "URETIM" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                      onClick={() => handleUPrimaryFilterChange("URETIM")}
                    >
                      Üretim Hareketleri
                    </button>
                    <button
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        uPrimaryFilter === "SEVKIYAT" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                      onClick={() => handleUPrimaryFilterChange("SEVKIYAT")}
                    >
                      Sevkiyat Hareketleri
                    </button>
                  </div>

                  {/* Standard Filters (Product & Date) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label text-xs">Ürün Arama (Ad / Kod)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ürün adı veya kodu girin..."
                        value={uFilterProduct}
                        onChange={(e) => setUFilterProduct(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Başlangıç Tarihi</label>
                      <input
                        type="date"
                        className="form-input"
                        value={uFilterStart}
                        onChange={(e) => setUFilterStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Bitiş Tarihi</label>
                      <input
                        type="date"
                        className="form-input"
                        value={uFilterEnd}
                        onChange={(e) => setUFilterEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-5">
                  <button className="btn btn-primary w-full sm:w-auto justify-center" onClick={handleUFilter} disabled={isPending}>
                    {isPending ? "Yükleniyor..." : "Filtreleri Uygula"}
                  </button>
                  <button
                    className="btn btn-secondary w-full sm:w-auto justify-center"
                    onClick={() => {
                      setUFilterProduct("");
                      setUPrimaryFilter("ALL");
                      setUSecondaryUretim("ALL");
                      setUFilterStart("");
                      setUFilterEnd("");
                      fetchUMovements(1, { type: undefined, searchQuery: undefined, startDate: undefined, endDate: undefined });
                    }}
                  >
                    Sıfırla
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-700">Ürün Stok Hareketleri</h2>
                  <span className="text-sm text-slate-400">{uTotalCount} kayıt</span>
                </div>
                <div className="flex items-center gap-2">
                  {uCancelMode ? (
                    <>
                      <span className="text-sm text-slate-500">{uSelectedIds.size} seçili</span>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={uSelectedIds.size === 0 || isPending}
                        onClick={handleUCancel}
                      >
                        {isPending ? "İptal ediliyor..." : `Seçilenleri İptal Et`}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setUCancelMode(false); setUSelectedIds(new Set()); setCancelError(null); }}
                      >
                        Vazgeç
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm flex items-center gap-1.5"
                      onClick={() => { setUCancelMode(true); setCancelError(null); setCancelSuccess(null); }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      İptal Et
                    </button>
                  )}
                </div>
              </div>

              {cancelError && activeTab === "urun" && (
                <div className="alert-error mx-4 mt-4">{cancelError}</div>
              )}
              {cancelSuccess && activeTab === "urun" && (
                <div className="alert-success mx-4 mt-4">{cancelSuccess}</div>
              )}
              {uCancelMode && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-700 text-sm">
                  ⚠️ İptal modundasınız. <strong>Üretim Girişi</strong> ve <strong>Sevkiyat Çıkışı</strong> hareketleri iptal edilebilir. Hareketleri seçip "Seçilenleri İptal Et"e tıklayın.
                </div>
              )}

              <div className="table-wrapper border-0 rounded-t-none">
                {uMovements.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-slate-400 text-sm">Hareket kaydı bulunamadı.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        {uCancelMode && <th className="w-10"></th>}
                        <th>Tarih</th>
                        <th>Ürün / Grup</th>
                        <th>Tip</th>
                        <th>Miktar</th>
                        <th>Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uMovements.map((m) => {
                        if (m.type === "ALT_MONTAJ_CIKISI") return null;

                        const typeInfo = U_TYPE_LABELS[m.type] || { label: m.type, className: "badge-slate", color: "text-slate-600", sign: "" };
                        const qty = parseFloat(m.quantity.toString());
                        const isCancellable = uCancelMode && (CANCELLABLE_U_TYPES.includes(m.type) || m.type === "GRUP_SEVKIYAT_CIKISI") && (!!m.productionRecord || !!m.shipmentRecord);
                        const isSelected = uSelectedIds.has(m.id);

                        let subChildren: any[] = [];
                        let isExpanded = false;
                        let toggleExpandFn = () => {};

                        if (m.type === "URETIM_GIRISI" && m.productionRecord?.productStockMovements) {
                          subChildren = m.productionRecord.productStockMovements;
                          isExpanded = expandedProductionIds.has(m.productionRecord.id);
                          toggleExpandFn = () => toggleProductionExpand(m.productionRecord!.id);
                        } else if (m.type === "GRUP_SEVKIYAT_CIKISI" && m.shipmentRecord?.productStockMovements) {
                          subChildren = m.shipmentRecord.productStockMovements;
                          isExpanded = expandedShipmentIds.has(m.shipmentRecord.id);
                          toggleExpandFn = () => toggleShipmentExpand(m.shipmentRecord!.id);
                        }

                        const isGrup = m.type === "GRUP_SEVKIYAT_CIKISI";
                        const hasChildren = subChildren.length > 0 && !isGrup;

                        return (
                          <Fragment key={m.id}>
                            <tr
                              className={`${uCancelMode && isCancellable ? "cursor-pointer hover:bg-amber-50" : ""} ${isSelected ? "bg-amber-100" : ""}`}
                              onClick={() => { if (isCancellable) toggleUSelect(m.id); }}
                            >
                              {uCancelMode && (
                                <td onClick={e => e.stopPropagation()}>
                                  {isCancellable ? (
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded accent-red-600"
                                      checked={isSelected}
                                      onChange={() => toggleUSelect(m.id)}
                                    />
                                  ) : (
                                    <span className="text-slate-300 text-xs">—</span>
                                  )}
                                </td>
                              )}
                              <td className="text-slate-500 text-sm whitespace-nowrap">
                                {new Date(m.date).toLocaleString("tr-TR", {
                                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                                })}
                              </td>
                              <td>
                                {isGrup ? (
                                  <div>
                                    <div className="font-semibold text-slate-800">{m.shipmentRecord?.shipmentGroup?.name || "Sevkiyat Grubu"}</div>
                                    {m.shipmentRecord?.shipmentGroup?.code && <div className="text-xs text-slate-400 font-mono">{m.shipmentRecord.shipmentGroup.code}</div>}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium text-slate-800">{m.product?.name}</div>
                                    {m.product?.code && <div className="text-xs text-slate-400 font-mono">{m.product.code}</div>}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={typeInfo.className}>{typeInfo.label}</span>
                              </td>
                              <td className={`font-semibold ${typeInfo.color}`}>
                                {qty > 0 ? "+" : ""}{qty.toLocaleString("tr-TR")} adet
                              </td>
                              <td className="text-slate-500 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    {m.type === "SEVKIYAT_CIKISI" && m.shipmentRecord && (
                                      <div className="font-medium text-slate-700 mb-0.5">Tekil sevkiyat</div>
                                    )}
                                    {m.description && <div>{m.description}</div>}
                                    {!m.description && m.type !== "SEVKIYAT_CIKISI" && m.type !== "GRUP_SEVKIYAT_CIKISI" && "—"}
                                  </div>
                                  {hasChildren && (
                                    <button
                                      className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                                        isGrup 
                                        ? "text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200" 
                                        : "text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100"
                                      }`}
                                      onClick={(e) => { e.stopPropagation(); toggleExpandFn(); }}
                                    >
                                      <svg
                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                      {subChildren.length} {isGrup ? "ürün türü" : "alt ürün"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Alt Çocuk Satırları (Üretim Alt Montaj veya Grup Sevkiyat Alt Çıkış) */}
                            {hasChildren && isExpanded && subChildren.map((sub: any) => {
                              const subQty = parseFloat(sub.quantity.toString());
                              const isSubGrup = isGrup; // görsel olarak ayrıştırmak için
                              return (
                                <tr key={sub.id} className={isSubGrup ? "bg-slate-50/50" : "bg-orange-50/60"}>
                                  {uCancelMode && <td></td>}
                                  <td className="text-slate-400 text-xs whitespace-nowrap pl-8">
                                    <span className={`${isSubGrup ? "text-slate-300" : "text-orange-400"} mr-1.5`}>└─</span>
                                    {!isSubGrup && new Date(sub.date).toLocaleString("tr-TR", {
                                      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                                    })}
                                  </td>
                                  <td>
                                    <div className="flex items-center gap-1.5 pl-4">
                                      <span className={`${isSubGrup ? "text-slate-300" : "text-orange-300"} text-xs`}>├</span>
                                      <div>
                                        <div className="text-sm font-medium text-slate-700">{sub.product?.name}</div>
                                        {!isSubGrup && sub.product?.code && <div className="text-xs text-slate-400 font-mono">{sub.product.code}</div>}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={isSubGrup ? "badge-slate text-xs opacity-75" : "badge-orange text-xs"}>
                                      {isSubGrup ? "Sevkiyat Çıkışı" : "Alt Montaj Çıkışı"}
                                    </span>
                                  </td>
                                  <td className={`font-semibold text-sm ${isSubGrup ? "text-slate-500 opacity-75" : "text-orange-600"}`}>
                                    {subQty.toLocaleString("tr-TR")} adet
                                  </td>
                                  <td className={`text-xs ${isSubGrup ? "text-slate-400 opacity-75" : "text-slate-400"}`}>
                                    {isSubGrup ? "(Grup içi)" : (sub.description || "—")}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {uPages > 1 && (
                <div className="px-6 pb-4">
                  <Pagination currentPage={uPage} totalPages={uPages} onPageChange={handleUPageChange} />
                </div>
              )}
            </div>
          </>
        )}


      </div>

      {/* Stok Kartı Modal (Hammadde) */}
      <Modal
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
        title={`Stok Kartı — ${cardMaterial?.name ?? ""}`}
        size="lg"
        footer={
          <button className="btn btn-secondary" onClick={() => setIsCardOpen(false)}>Kapat</button>
        }
      >
        {cardMaterial && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-xl p-5 text-center">
              <div className="text-sm text-slate-400 mb-1">Güncel Stok</div>
              <div className="text-4xl font-bold text-white">
                {parseFloat(cardMaterial.currentStock?.toString() || "0").toLocaleString("tr-TR", { maximumFractionDigits: 5 })}
              </div>
              <div className="text-slate-400 text-sm mt-1">{cardMaterial.unit}</div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
              {cardMovements.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">Hareket kaydı yok.</div>
              ) : (
                <table className="data-table text-xs">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Tarih</th>
                      <th>Tip</th>
                      <th>Miktar</th>
                      <th>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardMovements.map((mv: any) => {
                      const typeInfo = H_TYPE_LABELS[mv.type];
                      const amt = parseFloat(mv.amount?.toString() || "0");
                      return (
                        <tr key={mv.id}>
                          <td className="text-slate-500 whitespace-nowrap">
                            {new Date(mv.date).toLocaleString("tr-TR", {
                              day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </td>
                          <td><span className={typeInfo?.className}>{typeInfo?.label}</span></td>
                          <td className="font-semibold">
                            <span className={(mv.type === "GIRIS" || mv.type === "SEVKIYAT_GIRISI") ? "text-green-700" : "text-red-700"}>
                              {(mv.type === "GIRIS" || mv.type === "SEVKIYAT_GIRISI") ? "+" : "-"}{Math.abs(amt).toLocaleString("tr-TR", { maximumFractionDigits: 5 })} {cardMaterial.unit}
                            </span>
                          </td>
                          <td className="text-slate-500">{mv.description || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

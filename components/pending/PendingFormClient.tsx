"use client";

import { useState, useTransition, useMemo } from "react";
import { createPendingProductionEntry, createPendingShipmentEntry } from "@/lib/actions/pending";

interface ProductItem {
  id: string;
  name: string;
  code: string | null;
  unit?: string;
}

type RecentEntry = {
  id: string;
  type: string;
  productId: string | null;
  rawMaterialId: string | null;
  quantity: number;
  submittedByName: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  notes?: string | null;
  product?: { id: string; name: string; code: string | null } | null;
  rawMaterial?: { id: string; name: string; code: string | null; unit?: string } | null;
};

interface PendingFormClientProps {
  type: "URETIM" | "SEVKIYAT";
  products: ProductItem[];
  rawMaterials?: ProductItem[]; // added for SEVKIYAT
  title: string;
  recentEntries?: RecentEntry[];
}

type ViewState = "LANDING" | "FORM";
type ItemType = "PRODUCT" | "RAW_MATERIAL";
type Direction = "GIRIS" | "CIKIS";

type UnifiedItem = ProductItem & { _type: ItemType };

export function PendingFormClient({ type, products, rawMaterials = [], title, recentEntries = [] }: PendingFormClientProps) {
  const [view, setView] = useState<ViewState>(type === "SEVKIYAT" ? "LANDING" : "FORM");
  const [direction, setDirection] = useState<Direction>("CIKIS");
  const [itemType, setItemType] = useState<ItemType>("PRODUCT");

  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [submittedByName, setSubmittedByName] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const allItems: UnifiedItem[] = useMemo(() => {
    if (type === "URETIM") {
      return products.map(p => ({ ...p, _type: "PRODUCT" as ItemType }));
    }
    return [
      ...products.map(p => ({ ...p, _type: "PRODUCT" as ItemType })),
      ...rawMaterials.map(m => ({ ...m, _type: "RAW_MATERIAL" as ItemType }))
    ];
  }, [products, rawMaterials, type]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
  }, [allItems, itemSearch]);

  const filteredRecentEntries = useMemo(() => {
    if (!reportSearch.trim()) return recentEntries;
    const q = reportSearch.toLowerCase();
    return recentEntries.filter(entry => {
      const name = entry.product ? entry.product.name : entry.rawMaterial?.name || "";
      const dateStr = new Date(entry.submittedAt).toLocaleString("tr-TR", {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'});
      const ustaName = entry.submittedByName || "";
      return name.toLowerCase().includes(q) || dateStr.includes(q) || ustaName.toLowerCase().includes(q);
    });
  }, [recentEntries, reportSearch]);

  const selectedItem = allItems.find((p) => p.id === selectedItemId);

  const handleSelectItem = (p: UnifiedItem) => {
    setSelectedItemId(p.id);
    setItemType(p._type);
    setItemSearch(p.code ? `${p.name} (${p.code})` : p.name);
    setShowItemDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.set("quantity", quantity);
    formData.set("submittedByName", submittedByName);
    if (notes) formData.set("notes", notes);

    startTransition(async () => {
      try {
        if (type === "URETIM") {
          formData.set("productId", selectedItemId);
          await createPendingProductionEntry(formData);
        } else {
          formData.set("itemType", itemType);
          formData.set("direction", direction);
          formData.set("itemId", selectedItemId);
          await createPendingShipmentEntry(formData);
        }
        
        setSuccess("Gönderildi, teşekkürler!");
        setSelectedItemId("");
        setItemSearch("");
        setQuantity("");
        setSubmittedByName("");
        setNotes("");
        
        setTimeout(() => {
          setSuccess("");
          if (type === "SEVKIYAT") {
            setView("LANDING"); // Go back to landing
          }
        }, 3000);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  if (view === "LANDING") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center mb-2">
            <img src="/ald-logo.png" alt="ALD Plastik" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-center text-slate-800 mb-8">{title}</h1>
          
          <button
            onClick={() => {
              setDirection("GIRIS");
              setView("FORM");
            }}
            className="w-full py-8 bg-green-600 hover:bg-green-700 text-white text-3xl font-bold rounded-2xl shadow-xl transition-transform active:scale-95 flex flex-col items-center gap-2"
          >
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            SEVKİYAT GİRİŞ
          </button>
          
          <button
            onClick={() => {
              setDirection("CIKIS");
              setView("FORM");
            }}
            className="w-full py-8 bg-red-600 hover:bg-red-700 text-white text-3xl font-bold rounded-2xl shadow-xl transition-transform active:scale-95 flex flex-col items-center gap-2"
          >
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            SEVKİYAT ÇIKIŞ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="flex justify-center mb-3">
        <img src="/ald-logo.png" alt="ALD Plastik" className="h-10 w-auto object-contain" />
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative">
        
        {type === "SEVKIYAT" && (
          <button
            onClick={() => setView("LANDING")}
            className="absolute top-4 left-4 text-white hover:bg-white/20 p-2 rounded-lg transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
        )}

        <div className={`p-6 text-center pt-14 ${type === "SEVKIYAT" ? (direction === "GIRIS" ? "bg-green-600" : "bg-red-600") : "bg-blue-600"}`}>
          <h1 className="text-2xl font-bold text-white">
            {type === "URETIM" ? title : (direction === "GIRIS" ? "Sevkiyat Giriş Bildirimi" : "Sevkiyat Çıkış Bildirimi")}
          </h1>
        </div>

        <div className="p-6">
          {success && (
            <div className="mb-6 p-4 bg-green-100 border-2 border-green-500 rounded-xl text-green-700 font-bold text-lg text-center">
              ✅ {success}
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded-xl text-red-700 font-bold text-lg text-center whitespace-pre-line">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {type === "SEVKIYAT" ? "Ürün veya Hammadde Seçin" : "Ürün Seçin"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-4 text-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  placeholder={type === "SEVKIYAT" ? "Ad veya kod ile arayın..." : "Ürün adı veya kod..."}
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setSelectedItemId("");
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => setShowItemDropdown(true)}
                  onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                  autoComplete="off"
                />
                {showItemDropdown && itemSearch.trim() !== "" && (
                  <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="p-4 text-slate-500 text-center">Eşleşen kayıt bulunamadı.</div>
                    ) : (
                      filteredItems.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                          onMouseDown={() => handleSelectItem(p)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {type === "SEVKIYAT" && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p._type === "PRODUCT" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                {p._type === "PRODUCT" ? "ÜRÜN" : "HAMMADDE"}
                              </span>
                            )}
                            <div className="font-semibold text-lg text-slate-800 dark:text-slate-100">{p.name}</div>
                          </div>
                          {p.code && <div className="text-sm font-mono text-slate-500 dark:text-slate-400">{p.code}</div>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedItemId && (
                <div className={`mt-2 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${type === "SEVKIYAT" ? (direction === "GIRIS" ? "bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300") : "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Seçili: {selectedItem?.name} 
                  {type === "SEVKIYAT" && (
                     <span className="opacity-75">({selectedItem?._type === "PRODUCT" ? "Ürün" : "Hammadde"})</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Miktar ({selectedItem?.unit || 'Adet'})
              </label>
              <input
                type="number"
                min={selectedItem?._type === "PRODUCT" ? "1" : "0.0001"}
                step={selectedItem?._type === "PRODUCT" ? "1" : "any"}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-4 text-2xl font-bold text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                placeholder="0"
              />
              {selectedItem?._type === "PRODUCT" && (
                <p className="text-xs text-slate-400 mt-1 text-center">Ürün miktarı tam sayı olmalıdır</p>
              )}
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Adınız Soyadınız</label>
              <input
                type="text"
                required
                value={submittedByName}
                onChange={(e) => setSubmittedByName(e.target.value)}
                className="w-full p-4 text-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                placeholder="Adınızı yazın..."
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Açıklama <span className="text-sm font-normal text-slate-400">(Opsiyonel)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-4 text-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none resize-none"
                placeholder="Eklemek istediğiniz notlar..."
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !selectedItemId}
              className={`w-full text-white font-bold text-xl py-5 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2 disabled:bg-slate-400 ${type === "SEVKIYAT" ? (direction === "GIRIS" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700") : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  GÖNDER
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {recentEntries && recentEntries.length > 0 && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden mt-6">
          <div className="p-4 bg-slate-100 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-700 text-center mb-3">Son Gönderilen Raporlar</h2>
            <input
              type="text"
              placeholder="Ürün, tarih veya usta adı ile ara (örn: Ahmet)"
              className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
            />
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {filteredRecentEntries.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-4">Eşleşen kayıt bulunamadı.</div>
            ) : (
              filteredRecentEntries.map(entry => (
                <div key={entry.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center transition-colors hover:bg-slate-100">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">
                    {entry.product ? entry.product.name : entry.rawMaterial?.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {entry.submittedByName} • {new Date(entry.submittedAt).toLocaleString("tr-TR", {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'})}
                  </div>
                  {entry.notes && (
                    <div className="text-xs text-slate-600 mt-1 italic border-l-2 border-slate-300 pl-2">
                      "{entry.notes}"
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-700">
                    {entry.quantity} {entry.rawMaterial ? entry.rawMaterial.unit : "Adet"}
                  </div>
                  <div className="mt-1">
                    {entry.status === "BEKLIYOR" && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">BEKLİYOR</span>}
                    {entry.status === "ONAYLANDI" && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">ONAYLANDI</span>}
                    {entry.status === "REDDEDILDI" && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">REDDEDİLDİ</span>}
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

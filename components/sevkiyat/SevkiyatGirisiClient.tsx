"use client";

import { useState, useTransition, useMemo } from "react";
import { createSevkiyatGirisi } from "@/lib/actions/sevkiyat-girisi";

interface ItemBasic {
  id: string;
  name: string;
  code: string | null;
  unit?: string; // Sadece hammaddede var
  currentStock: number | string;
}

interface CombinedItem extends ItemBasic {
  _type: "raw" | "product";
}

interface SevkiyatGirisiEntry {
  id: string;
  type: "raw" | "product";
  name: string;
  code: string | null;
  unit: string;
  amount: number;
  date: string;
  description: string | null;
}

interface SevkiyatGirisiClientProps {
  rawMaterials: ItemBasic[];
  products: ItemBasic[];
  recentEntries: SevkiyatGirisiEntry[];
}

function getLocalISOTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function SevkiyatGirisiClient({ rawMaterials, products, recentEntries }: SevkiyatGirisiClientProps) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getLocalISOTime());
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const allList: CombinedItem[] = useMemo(() => [
    ...products.map(p => ({ ...p, _type: "product" as const })),
    ...rawMaterials.map(r => ({ ...r, _type: "raw" as const }))
  ], [products, rawMaterials]);
  
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allList;
    return allList.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q))
    );
  }, [allList, search]);

  const selectedItem = allList.find((i) => i.id === selectedItemId);

  const handleSelectItem = (item: CombinedItem) => {
    setSelectedItemId(item.id);
    setSearch(item.code ? `${item.name} (${item.code})` : item.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.set("type", selectedItem?._type || "product");
    formData.set("itemId", selectedItemId);
    formData.set("quantity", quantity);
    formData.set("description", description);
    formData.set("date", date);

    startTransition(async () => {
      try {
        const res = await createSevkiyatGirisi(formData);
        if (res.success) {
          setSuccess("Sevkiyat girişi başarıyla kaydedildi.");
          setSelectedItemId("");
          setSearch("");
          setQuantity("");
          setDescription("");
          setDate(getLocalISOTime());
          setTimeout(() => setSuccess(""), 3000);
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Sevkiyat Girişi</h1>
      </div>

      <div className="page-body">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Card */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-slate-700">Yeni Giriş Kaydı</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Kalem Arama */}
                  <div>
                    <label className="form-label">İlgili Kalem *</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Hammadde veya Ürün adı ya da kodu ile ara"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setSelectedItemId("");
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        autoComplete="off"
                      />
                      {showDropdown && search.trim() !== "" && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredList.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-400">Eşleşen kayıt bulunamadı.</div>
                          ) : (
                            filteredList.map((item) => (
                              <button
                                key={`${item._type}_${item.id}`}
                                type="button"
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between gap-2 border-b border-slate-100 last:border-0"
                                onMouseDown={() => handleSelectItem(item)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{item.name}</span>
                                  {item._type === "raw" ? (
                                    <span className="badge-blue text-[10px] px-1.5 py-0">Hammadde</span>
                                  ) : (
                                    <span className="badge-purple text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 border">Ürün</span>
                                  )}
                                </div>
                                {item.code && (
                                  <span className="badge-blue text-xs font-mono">{item.code}</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {selectedItemId && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Seçildi: <strong>{selectedItem?.name}</strong>
                        {selectedItem?.code && <span className="ml-1 font-mono text-slate-500">({selectedItem.code})</span>}
                      </p>
                    )}
                  </div>

                  {/* Miktar */}
                  <div>
                    <label className="form-label">Giriş Miktarı / Adedi *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="form-input pr-16"
                        placeholder="örn: 10"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-sm">
                          {selectedItem?._type === "raw" ? (selectedItem?.unit || "birim") : "adet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tarih */}
                  <div>
                    <label className="form-label">Tarih & Saat *</label>
                    <input
                      type="datetime-local"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="form-label">Açıklama (opsiyonel)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-input"
                      placeholder="İade, tedarik vb."
                    />
                  </div>

                  {/* Hata / Başarı */}
                  {error && <div className="alert-error whitespace-pre-line text-sm">{error}</div>}
                  {success && <div className="alert-success text-sm">{success}</div>}

                  <button
                    type="submit"
                    disabled={isPending || !selectedItemId}
                    className="btn btn-primary w-full justify-center py-2.5"
                  >
                    {isPending ? "Kaydediliyor..." : "Girişi Kaydet"}
                  </button>
                </form>
              </div>
            </div>
          </div>
          
          {/* Info / Stock Card */}
          <div>
            {selectedItem ? (
              <div className="card h-full bg-slate-50 border-slate-200 flex flex-col justify-center items-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                  {selectedItem._type === "raw" ? (
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{selectedItem.name}</h3>
                {selectedItem.code && <p className="text-sm font-mono text-slate-500 mb-6">{selectedItem.code}</p>}
                
                <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm w-full max-w-xs">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Mevcut Stok</p>
                  <div className="text-3xl font-bold text-slate-800">
                    {parseFloat(selectedItem.currentStock.toString()).toLocaleString("tr-TR")}
                    <span className="text-base font-normal text-slate-500 ml-1">
                      {selectedItem._type === "raw" ? (selectedItem.unit || "birim") : "adet"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card h-full bg-slate-50 border-slate-200 flex flex-col justify-center items-center p-8 text-center text-slate-400">
                <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Stok miktarını görmek için<br/>lütfen bir kalem seçin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Son Girişler */}
        <div className="card mt-6">
          <div className="card-header">
            <h2 className="font-semibold text-slate-700">Son Sevkiyat Girişleri</h2>
          </div>
          <div className="table-wrapper border-0 rounded-t-none">
            {recentEntries.length === 0 ? (
              <div className="empty-state">
                <p className="text-slate-400 text-sm">Henüz sevkiyat girişi bulunmuyor.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tür</th>
                    <th>Kalem (Hammadde/Ürün)</th>
                    <th>Kod</th>
                    <th>Miktar</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((rec) => (
                    <tr key={rec.id}>
                      <td className="text-slate-500 text-sm">
                        {new Date(rec.date).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        {rec.type === "raw" ? (
                          <span className="badge-blue text-xs">Hammadde</span>
                        ) : (
                          <span className="badge-purple text-xs bg-purple-50 text-purple-700 border-purple-200 border">Ürün</span>
                        )}
                      </td>
                      <td className="font-medium text-slate-800">{rec.name}</td>
                      <td>
                        {rec.code ? (
                          <span className="badge-blue font-mono text-xs">{rec.code}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        <span className="font-semibold text-green-600">
                          +{rec.amount.toLocaleString("tr-TR")} {rec.unit}
                        </span>
                      </td>
                      <td className="text-slate-500">{rec.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

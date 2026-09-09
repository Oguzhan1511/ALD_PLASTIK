"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getProductCycles,
  upsertProductCycleOverride,
  deleteProductCycleOverride,
  deleteAllProductCycleOverrides,
} from "@/lib/actions/product-cycles";

export type ProductCycleItem = {
  code: string | null;
  name: string;
  cavity: number | null;
  cycle: number | null;
  isOverridden: boolean;
  hasDefault: boolean;
};

export default function ProductCyclesModal({ onClose, onUpdated }: { onClose: () => void; onUpdated?: () => void }) {
  const [cycles, setCycles] = useState<ProductCycleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ cavity: 1, cycle: 60 });
  const [isPending, startTransition] = useTransition();

  const loadCycles = async () => {
    setIsLoading(true);
    try {
      const data = await getProductCycles();
      setCycles(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  const filtered = cycles.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const hasOverrides = cycles.some((c) => c.isOverridden);

  const handleStartEdit = (item: ProductCycleItem) => {
    if (!item.code) return;
    setEditingCode(item.code);
    setEditForm({ cavity: item.cavity ?? 1, cycle: item.cycle ?? 60 });
  };

  const handleSaveEdit = (code: string) => {
    startTransition(async () => {
      await upsertProductCycleOverride(code, editForm.cavity, editForm.cycle);
      await loadCycles();
      setEditingCode(null);
      onUpdated?.();
    });
  };

  const handleReset = (code: string) => {
    startTransition(async () => {
      await deleteProductCycleOverride(code);
      await loadCycles();
      onUpdated?.();
    });
  };

  const handleResetAll = () => {
    if (!confirm("Tüm özel süreler sıfırlanacak. Onaylıyor musunuz?")) return;
    startTransition(async () => {
      await deleteAllProductCycleOverrides();
      await loadCycles();
      onUpdated?.();
    });
  };

  const formatCycle = (seconds: number) => {
    if (seconds < 60) return `${seconds}sn`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}dk ${s}sn` : `${m}dk`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Ürün Üretim Süreleri</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ürünlerin kalıp adedi ve çevrim sürelerini düzenleyebilirsiniz.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Ürün adı veya kodu ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {hasOverrides && (
            <button
              onClick={handleResetAll}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tümünü Sıfırla
            </button>
          )}
          {isPending && (
            <span className="text-xs text-blue-600 animate-pulse font-medium">Kaydediliyor...</span>
          )}
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{filtered.length}</span> ürün
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Yükleniyor...
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün Kodu</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Kalıp Adedi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Çevrim Süresi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map((item, idx) => {
                  const isEditing = item.code ? editingCode === item.code : false;
                  const canEdit = !!item.code;
                  return (
                    <tr
                      key={item.code ?? `no-code-${idx}`}
                      className={`transition-colors ${
                        item.isOverridden
                          ? "bg-amber-50/50"
                          : !item.cavity && !item.cycle
                          ? "bg-gray-50/60"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Kod */}
                      <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.isOverridden && (
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Özelleştirilmiş"></span>
                          )}
                          {item.code ? (
                            <span className="text-gray-600">{item.code}</span>
                          ) : (
                            <span className="text-gray-300 italic text-xs">kod yok</span>
                          )}
                        </div>
                      </td>

                      {/* Ad */}
                      <td className="px-4 py-3 text-sm text-gray-800">{item.name}</td>

                      {/* Kalıp adedi */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={editForm.cavity}
                            onChange={(e) => setEditForm((f) => ({ ...f, cavity: Number(e.target.value) }))}
                            className="w-20 text-center text-sm border border-blue-400 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        ) : item.cavity != null ? (
                          <span className={`text-sm font-semibold ${item.isOverridden ? "text-amber-700" : "text-gray-700"}`}>
                            {item.cavity}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Çevrim süresi */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={editForm.cycle}
                              onChange={(e) => setEditForm((f) => ({ ...f, cycle: Number(e.target.value) }))}
                              className="w-20 text-center text-sm border border-blue-400 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <span className="text-xs text-gray-500">sn</span>
                          </div>
                        ) : item.cycle != null ? (
                          <div>
                            <span className={`text-sm font-semibold ${item.isOverridden ? "text-amber-700" : "text-gray-700"}`}>
                              {formatCycle(item.cycle)}
                            </span>
                            <span className="block text-xs text-gray-400">({item.cycle}sn)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* İşlem */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(item.code!)}
                              disabled={isPending}
                              className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                              title="Kaydet"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingCode(null)}
                              disabled={isPending}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                              title="İptal"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => handleStartEdit(item)}
                                disabled={isPending}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                                title="Düzenle"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {item.isOverridden && (
                              <button
                                onClick={() => handleReset(item.code!)}
                                disabled={isPending}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors disabled:opacity-50"
                                title="Varsayılana sıfırla"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                      Arama kriterine uygun ürün bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
              Özelleştirilmiş değer
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

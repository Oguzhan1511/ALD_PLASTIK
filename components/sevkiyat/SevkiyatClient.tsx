"use client";

import { useState, useTransition, useMemo } from "react";
import { createSingleProductShipment } from "@/lib/actions/sevkiyat";
import { Decimal } from "@prisma/client/runtime/library";

interface ProductItem {
  id: string;
  name: string;
  code: string | null;
  currentStock: Decimal;
}

interface SevkiyatClientProps {
  products: ProductItem[];
}

function getLocalISOTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function SevkiyatClient({ products }: SevkiyatClientProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getLocalISOTime());

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  // Tekil Ürün Arama
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleSelectProduct = (p: ProductItem) => {
    setSelectedProductId(p.id);
    setProductSearch(p.code ? `${p.name} (${p.code})` : p.name);
    setShowProductDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedProductId) {
      setError("Lütfen bir ürün seçin.");
      return;
    }

    const formData = new FormData();
    formData.set("quantity", quantity);
    formData.set("description", description);
    formData.set("date", date);
    formData.set("productId", selectedProductId);

    startTransition(async () => {
      try {
        const res = await createSingleProductShipment(formData);
          
        if (res.success) {
          showSuccess("Sevkiyat başarıyla kaydedildi.");
          setSelectedProductId("");
          setProductSearch("");
          setQuantity("");
          setDescription("");
          setDate(getLocalISOTime());
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Sevkiyat Çıkışı</h1>
      </div>

      <div className="page-body">
        {success && <div className="alert-success mb-4">{success}</div>}
        {error && <div className="alert-error mb-4 whitespace-pre-line">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Card */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-slate-700">
                  Yeni Sevkiyat Kaydı
                </h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  <div>
                    <label className="form-label">Ürün *</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ürün adı veya kod ile ara"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setSelectedProductId("");
                          setShowProductDropdown(true);
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                        autoComplete="off"
                      />
                      {showProductDropdown && productSearch.trim() !== "" && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredProducts.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-400">Eşleşen ürün bulunamadı.</div>
                          ) : (
                            filteredProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between gap-2 border-b border-slate-100 last:border-0"
                                onMouseDown={() => handleSelectProduct(p)}
                              >
                                <span className="font-medium text-slate-800">{p.name}</span>
                                {p.code && <span className="badge-blue text-xs font-mono">{p.code}</span>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {selectedProductId && (
                      <p className="text-xs text-green-600 mt-1.5 font-medium bg-green-50 px-2 py-1.5 rounded-md border border-green-100 inline-block">
                        ✓ Seçildi: <strong>{selectedProduct?.name}</strong> (Mevcut Stok: {parseFloat(selectedProduct?.currentStock?.toString() || "0").toLocaleString("tr-TR")})
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Miktar *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="form-input"
                        placeholder="Sevk edilen adet/miktar"
                      />
                    </div>

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
                  </div>

                  <div>
                    <label className="form-label">Açıklama (opsiyonel)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-input"
                      placeholder="İrsaliye no, müşteri vb."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || !selectedProductId}
                    className="btn btn-primary w-full justify-center py-2.5"
                  >
                    {isPending ? "Kaydediliyor..." : "Sevkiyatı Kaydet"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div>
            <div className="card h-full">
              <div className="card-header">
                <h2 className="font-semibold text-slate-700">Stok Düşüm Önizlemesi</h2>
              </div>
              <div className="card-body">
                {selectedProduct ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 mb-3 border-b pb-2">
                      <strong>{parseInt(quantity) || 0} adet</strong> {selectedProduct.name} sevk edildiğinde düşülecek miktar:
                    </p>
                    {(() => {
                      const qty = parseInt(quantity) || 0;
                      const available = parseFloat(selectedProduct.currentStock.toString());
                      const isInsufficient = qty > available;
                      
                      return (
                        <div
                          className="rounded-lg p-3 border"
                          style={isInsufficient
                            ? { backgroundColor: "var(--badge-red-bg)", borderColor: "var(--alert-error-border)" }
                            : { backgroundColor: "var(--badge-green-bg)", borderColor: "var(--alert-success-border)" }
                          }
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-slate-800">
                              {selectedProduct.name}
                            </span>
                            {isInsufficient ? (
                              <span className="badge-red text-xs">⚠ Yetersiz</span>
                            ) : (
                              <span className="badge-green text-xs">✓ Yeterli</span>
                            )}
                          </div>
                          <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                            <div>
                              Düşülecek:{" "}
                              <strong className={isInsufficient ? "text-red-600" : "text-slate-700"}>
                                {qty.toLocaleString("tr-TR", { maximumFractionDigits: 5 })}
                              </strong>
                            </div>
                            <div>
                              Mevcut Stok:{" "}
                              <strong className="text-slate-700">
                                {available.toLocaleString("tr-TR", { maximumFractionDigits: 5 })}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-slate-400 text-sm h-full min-h-[150px]">
                    <svg className="w-10 h-10 mb-2 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Ürün ve adet seçtiğinizde düşülecek stok miktarları burada görünür.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

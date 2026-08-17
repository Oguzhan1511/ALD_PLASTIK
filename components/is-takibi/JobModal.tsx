"use client";

import { useState } from "react";
import { createJobSchedule, updateJobSchedule } from "@/lib/actions/is-takibi";

export default function JobModal({ machine, date, job, products, rawMaterials, onClose, onRefresh }: any) {
  const isEdit = !!job;
  
  // Düzenleme modundaysak, bitiş saatinden başlangıç saatini çıkarıp süreyi (saat) bulalım
  const calculateInitialDuration = () => {
    if (!isEdit) return 4;
    const start = new Date(job.startTime).getTime();
    const end = new Date(job.endTime).getTime();
    return Math.round((end - start) / (1000 * 60 * 60)) || 1;
  };

  const [productSearch, setProductSearch] = useState(() => {
    if (job?.productId) {
      const p = products.find((x: any) => x.id === job.productId);
      return p ? p.name : "";
    }
    return "";
  });

  const [formData, setFormData] = useState({
    productId: job?.productId || "",
    rawMaterialId: job?.rawMaterialId || "",
    startDate: isEdit ? new Date(job.startTime).toISOString().split('T')[0] : date,
    startTime: isEdit ? new Date(job.startTime).toTimeString().substring(0, 5) : "08:00",
    durationHours: calculateInitialDuration(),
    expectedQty: job?.expectedQty || "",
    status: job?.status || "PLANLANDI",
    notes: job?.notes || "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updates: any = { [name]: value };

    // Eğer ürün değişirse, reçetesine bakıp varsayılan hammaddeyi otomatik seç
    if (name === "productId") {
      const selectedProduct = products.find((p: any) => p.id === value);
      if (selectedProduct?.recipes?.length > 0) {
        const firstRecipe = selectedProduct.recipes.find((r: any) => r.rawMaterialId);
        if (firstRecipe) {
          updates.rawMaterialId = firstRecipe.rawMaterialId;
        }
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const getRawMaterialInfo = () => {
    if (!formData.productId) return [];
    
    const product = products.find((p: any) => p.id === formData.productId);
    if (!product || !product.recipes) return [];
    
    return product.recipes
      .filter((r: any) => r.rawMaterialId)
      .map((r: any) => {
        const rawMaterial = rawMaterials.find((rm: any) => rm.id === r.rawMaterialId);
        if (!rawMaterial) return null;
        
        const expected = formData.expectedQty ? Number(formData.expectedQty) : 0;
        const reqQty = expected * r.quantityPerUnit * (1 + (r.wastePercentage / 100));
        const stock = rawMaterial.currentStock || 0;

        return { id: rawMaterial.id, name: rawMaterial.name, reqQty, stock, unit: rawMaterial.unit || 'kg' };
      })
      .filter(Boolean);
  };

  const rmInfoList = getRawMaterialInfo();

  // Otomatik Bitiş Tarih/Saat Hesaplama
  const calculateEndDateTime = () => {
    if (!formData.startDate || !formData.startTime || !formData.durationHours) return null;
    const start = new Date(`${formData.startDate}T${formData.startTime}:00`);
    start.setMinutes(start.getMinutes() + (Number(formData.durationHours) * 60)); // Saat cinsinden ekleme
    return start;
  };

  const endDateTimeObj = calculateEndDateTime();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.productId) {
      setError("Lütfen bir ürün seçin.");
      return;
    }
    if (!formData.startDate || !formData.startTime) {
      setError("Lütfen başlangıç tarih ve saatini girin.");
      return;
    }
    if (!formData.durationHours || Number(formData.durationHours) <= 0) {
      setError("Tahmini süre 0'dan büyük olmalıdır.");
      return;
    }

    // Saatleri birleştirip Date objesi oluşturma
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
    const endDateTime = calculateEndDateTime();
    
    if (!endDateTime) {
      setError("Bitiş zamanı hesaplanamadı.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        machineId: machine.id,
        productId: formData.productId,
        rawMaterialId: formData.rawMaterialId || null,
        startTime: startDateTime,
        endTime: endDateTime,
        expectedQty: formData.expectedQty ? Number(formData.expectedQty) : null,
        status: formData.status,
        notes: formData.notes,
      };

      if (isEdit) {
        await updateJobSchedule(job.id, payload);
      } else {
        await createJobSchedule(payload);
      }

      onRefresh();
    } catch (err: any) {
      console.error(err);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? "İş Planını Düzenle" : "Yeni İş Planı Ekle"}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Makine</label>
            <input 
              type="text" 
              value={machine.name} 
              disabled 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-600 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi *</label>
              <input 
                type="date" 
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Saati *</label>
              <input 
                type="time" 
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahmini Süre (Saat) *</label>
              <input 
                type="number" 
                name="durationHours"
                value={formData.durationHours}
                onChange={handleChange}
                required
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider block mb-0.5">Hesaplanan Bitiş Zamanı</span>
              <div className="text-sm font-medium text-blue-900">
                {endDateTimeObj ? (
                  `${endDateTimeObj.toLocaleDateString('tr-TR')} - ${endDateTimeObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                ) : (
                  "-"
                )}
              </div>
            </div>
            <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Üretilecek Ürün *</label>
            <input 
              type="text"
              list="products-list"
              value={productSearch}
              onChange={(e) => {
                const val = e.target.value;
                setProductSearch(val);
                const selected = products.find((p: any) => p.name === val);
                if (selected) {
                  handleChange({ target: { name: 'productId', value: selected.id } } as any);
                } else {
                  handleChange({ target: { name: 'productId', value: '' } } as any);
                }
              }}
              required
              placeholder="Ürün Ara veya Seçin..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <datalist id="products-list">
              {products.map((p: any) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>



          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Üretim Miktarı</label>
              <input 
                type="number" 
                name="expectedQty"
                value={formData.expectedQty}
                onChange={handleChange}
                placeholder="Örn: 1000"
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PLANLANDI">Planlandı</option>
                <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                <option value="TAMAMLANDI">Tamamlandı</option>
                <option value="IPTAL">İptal Edildi</option>
              </select>
            </div>
          </div>

          {rmInfoList.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Gerekli Hammaddeler</h4>
              <div className="space-y-2">
                {rmInfoList.map((rm: any) => (
                  <div key={rm.id} className={`p-3 rounded-lg border flex justify-between items-center ${rm.stock >= rm.reqQty ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{rm.name}</span>
                      <span className={`text-sm font-bold ${rm.stock >= rm.reqQty ? 'text-green-700' : 'text-red-700'}`}>
                        {rm.reqQty.toFixed(2)} {rm.unit}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Mevcut Stok</span>
                      <span className="text-sm font-bold text-gray-700">
                        {rm.stock.toFixed(2)} {rm.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Eklemek istediğiniz notlar..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isLoading ? "Kaydediliyor..." : (isEdit ? "Güncelle" : "Kaydet")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

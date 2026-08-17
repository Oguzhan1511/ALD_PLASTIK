"use client";

import { useState, useTransition } from "react";
import { approvePendingEntry, rejectPendingEntry } from "@/lib/actions/pending";
import { Decimal } from "@prisma/client/runtime/library";

type PendingEntry = {
  id: string;
  type: string;
  productId: string | null;
  rawMaterialId: string | null;
  quantity: number;
  submittedByName: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  product?: { id: string; name: string; code: string | null } | null;
  rawMaterial?: { id: string; name: string; code: string | null; unit?: string } | null;
};

interface RaporlarClientProps {
  pendingEntries: PendingEntry[];
  approvedEntries: PendingEntry[];
  rejectedEntries: PendingEntry[];
  uretimToken: string;
  sevkiyatToken: string;
}

export function RaporlarClient({ pendingEntries, approvedEntries, rejectedEntries, uretimToken, sevkiyatToken }: RaporlarClientProps) {
  const [activeTab, setActiveTab] = useState<"bekleyen" | "onaylanan" | "reddedilen">("bekleyen");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    setError("");
    startTransition(async () => {
      try {
        await approvePendingEntry(id);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;
    setError("");
    startTransition(async () => {
      try {
        await rejectPendingEntry(rejectId, rejectReason);
        setRejectId(null);
        setRejectReason("");
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const renderTable = (entries: PendingEntry[], showActions: boolean) => {
    if (entries.length === 0) {
      return <div className="text-center py-8 text-slate-500">Bu kategoride kayıt bulunmamaktadır.</div>;
    }

    return (
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tür</th>
              <th>Usta Adı</th>
              <th>Ürün</th>
              <th>Miktar</th>
              {showActions ? <th>İşlemler</th> : <th>Durum / Sebep</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap">
                  {new Date(entry.submittedAt).toLocaleString("tr-TR")}
                </td>
                <td>
                  {entry.type === "URETIM" && <span className="badge badge-blue">Üretim</span>}
                  {entry.type === "SEVKIYAT" && <span className="badge badge-red">Sevkiyat</span>}
                  {entry.type === "SEVKIYAT_GIRISI" && <span className="badge badge-green">Sevkiyat Giriş</span>}
                  {entry.type === "SEVKIYAT_CIKISI" && <span className="badge badge-red">Sevkiyat Çıkış</span>}
                </td>
                <td className="font-medium text-slate-700">{entry.submittedByName}</td>
                <td>
                  <span className="text-xs font-semibold uppercase text-slate-500 mr-2">
                    {entry.productId ? "ÜRÜN" : "HAMMADDE"}
                  </span>
                  {entry.productId ? entry.product?.name : entry.rawMaterial?.name}
                  {(entry.product?.code || entry.rawMaterial?.code) && <span className="text-xs text-slate-400 ml-1">({entry.product?.code || entry.rawMaterial?.code})</span>}
                </td>
                <td className="font-semibold text-slate-700">
                  {parseFloat(entry.quantity.toString()).toLocaleString("tr-TR")} {entry.rawMaterial ? entry.rawMaterial.unit : "Adet"}
                </td>
                {showActions ? (
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(entry.id)}
                        disabled={isPending}
                        className="btn btn-primary btn-sm"
                      >
                        Onayla
                      </button>
                      <button
                        onClick={() => setRejectId(entry.id)}
                        disabled={isPending}
                        className="btn btn-danger btn-sm"
                      >
                        Reddet
                      </button>
                    </div>
                  </td>
                ) : (
                  <td>
                    {entry.status === "ONAYLANDI" && (
                      <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Onaylandı
                      </span>
                    )}
                    {entry.status === "REDDEDILDI" && (
                      <div className="text-sm">
                        <span className="text-red-600 font-medium flex items-center gap-1 mb-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Reddedildi
                        </span>
                        <span className="text-slate-500 text-xs truncate max-w-[200px] block" title={entry.rejectionReason || ""}>
                          {entry.rejectionReason}
                        </span>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Onay Bekleyen İşlemler</h1>
      </div>

      <div className="page-body">
        {/* Token Links Section */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Usta Formu Bağlantıları
          </h2>
          <p className="text-sm text-blue-800 mb-4">
            Aşağıdaki linkleri ustalara ileterek formları kullanmalarını sağlayabilirsiniz. Bu linkler güvenliğiniz için gizli tutulmalıdır.
          </p>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className="font-medium text-sm w-32 shrink-0">Üretim Girişi:</span>
              <div className="flex-1 flex gap-2 w-full">
                <input 
                  type="text" 
                  readOnly 
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/u/${uretimToken}/uretim`} 
                  className="form-input text-sm bg-white font-mono text-slate-500 flex-1" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/u/${uretimToken}/uretim`);
                    alert("Üretim linki kopyalandı!");
                  }}
                  className="btn btn-secondary shrink-0"
                >
                  Kopyala
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <span className="font-medium text-sm w-32 shrink-0">Sevkiyat Çıkışı:</span>
              <div className="flex-1 flex gap-2 w-full">
                <input 
                  type="text" 
                  readOnly 
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/u/${sevkiyatToken}/sevkiyat`} 
                  className="form-input text-sm bg-white font-mono text-slate-500 flex-1" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/u/${sevkiyatToken}/sevkiyat`);
                    alert("Sevkiyat linki kopyalandı!");
                  }}
                  className="btn btn-secondary shrink-0"
                >
                  Kopyala
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert-error mb-4">
            {error}
          </div>
        )}

        <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "bekleyen"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
            onClick={() => { setActiveTab("bekleyen"); setError(""); setRejectId(null); }}
          >
            Bekleyen Onaylar ({pendingEntries.length})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "onaylanan"
                ? "border-green-600 text-green-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
            onClick={() => { setActiveTab("onaylanan"); setError(""); setRejectId(null); }}
          >
            Geçmiş (Onaylananlar)
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "reddedilen"
                ? "border-red-600 text-red-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
            onClick={() => { setActiveTab("reddedilen"); setError(""); setRejectId(null); }}
          >
            Reddedilenler
          </button>
        </div>

        <div className="card">
          <div className="card-body p-0">
            {activeTab === "bekleyen" && renderTable(pendingEntries, true)}
            {activeTab === "onaylanan" && renderTable(approvedEntries, false)}
            {activeTab === "reddedilen" && renderTable(rejectedEntries, false)}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-lg">Talebi Reddet</h3>
              <button onClick={() => setRejectId(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleReject}>
              <div className="p-4">
                <label className="form-label">Reddetme Sebebi *</label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Lütfen reddetme sebebini kısaca açıklayın (usta için not)..."
                />
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setRejectId(null)} className="btn btn-secondary">İptal</button>
                <button type="submit" disabled={isPending || !rejectReason.trim()} className="btn bg-red-600 hover:bg-red-700 text-white border-0">Reddet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

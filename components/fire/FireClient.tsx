"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FireRecord {
  id: string;
  quantity: number;
  date: Date;
  description: string | null;
  product: { id: string; name: string; code: string | null };
}

interface SummaryItem {
  productId: string;
  name: string;
  code: string | null;
  fireTotal: number;
  productionTotal: number;
  percentage: number;
}

interface FireClientProps {
  initialRecords: FireRecord[];
  summary: SummaryItem[];
  startDate: string;
  endDate: string;
}

export function FireClient({ initialRecords, summary, startDate, endDate }: FireClientProps) {
  const router = useRouter();
  const [filterStart, setFilterStart] = useState(startDate);
  const [filterEnd, setFilterEnd] = useState(endDate);

  const totalFire = summary.reduce((sum, item) => sum + item.fireTotal, 0);

  const handleFilter = () => {
    router.push(`/fire?start=${filterStart}&end=${filterEnd}`);
  };

  const handleExportExcel = () => {
    const data: any[] = initialRecords.map((r) => ({
      Tarih: new Date(r.date).toLocaleString("tr-TR"),
      "Ürün Kodu": r.product.code || "-",
      "Ürün Adı": r.product.name,
      "Fire Adedi": r.quantity,
      Açıklama: r.description || "-",
    }));

    data.push({
      Tarih: "",
      "Ürün Kodu": "",
      "Ürün Adı": "TOPLAM FİRE:",
      "Fire Adedi": totalFire,
      Açıklama: "",
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fireler");
    XLSX.writeFile(wb, `Fire_Kayitlari_${startDate}_${endDate}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    
    // TR Karakter desteği için varsayılan fontları kullanamıyoruz ama standart jspdf fontları 
    // ingilizce olduğu için bazı tr karakterler çıkmaz. Basit tutalım.
    doc.text(`Fire Kayitlari (${startDate} - ${endDate})`, 14, 15);

    const tableData = initialRecords.map((r) => [
      new Date(r.date).toLocaleDateString("tr-TR"),
      r.product.code || "-",
      r.product.name,
      r.quantity.toString(),
      r.description || "-"
    ]);

    autoTable(doc, {
      head: [["Tarih", "Urun Kodu", "Urun Adi", "Adet", "Aciklama"]],
      body: tableData,
      startY: 20,
      styles: { font: "helvetica" },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 20;
    doc.setFont("helvetica", "bold");
    doc.text(`Toplam Fire: ${totalFire.toLocaleString("tr-TR")} adet`, 14, finalY + 10);

    doc.save(`Fire_Kayitlari_${startDate}_${endDate}.pdf`);
  };

  return (
    <>
      <div className="page-header flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="page-title">Fire Takibi</h1>
          <p className="text-sm text-slate-500 mt-1">Üretim sırasında oluşan ıskarta / fire miktarları</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="form-input bg-white text-sm" 
              value={filterStart} 
              onChange={e => setFilterStart(e.target.value)} 
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              className="form-input bg-white text-sm" 
              value={filterEnd} 
              onChange={e => setFilterEnd(e.target.value)} 
            />
            <button 
              onClick={handleFilter}
              className="btn btn-primary px-3 py-1.5"
            >
              Filtrele
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel}
              className="btn bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Excel
            </button>
            <button 
              onClick={handleExportPdf}
              className="btn bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-1.5 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sol Kolon: Aylık Özet */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <div className="card-body p-6 text-center">
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Toplam Fire
                </div>
                <div className="text-4xl font-bold text-red-600">
                  {totalFire.toLocaleString("tr-TR")}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {new Date(startDate).toLocaleDateString("tr-TR")} - {new Date(endDate).toLocaleDateString("tr-TR")}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-slate-700">Ürün Bazında Fire</h2>
              </div>
              <div className="card-body p-0">
                {summary.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    Bu ay fire kaydı bulunmuyor.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {summary.map((item) => (
                      <li key={item.productId} className="flex flex-col p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1 pr-4">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                            {item.code && <p className="text-xs font-mono text-slate-400">{item.code}</p>}
                          </div>
                          <div className="text-sm font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md shrink-0">
                            {item.fireTotal.toLocaleString("tr-TR")} adet
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 p-2 rounded border border-slate-100">
                          <div>
                            Üretim: <span className="font-medium text-slate-700">{item.productionTotal.toLocaleString("tr-TR")}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Oran: <span className="font-medium text-amber-700">%{item.percentage.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Hareket Geçmişi */}
          <div className="lg:col-span-2">
            <div className="card h-full">
              <div className="card-header">
                <h2 className="font-semibold text-slate-700">Fire Hareket Geçmişi</h2>
              </div>
              <div className="table-wrapper border-0 rounded-t-none h-full">
                {initialRecords.length === 0 ? (
                  <div className="empty-state h-full min-h-[300px]">
                    <p className="text-slate-400 text-sm">Bu döneme ait fire kaydı bulunamadı.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Ürün</th>
                        <th>Adet</th>
                        <th>Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="text-slate-500 text-sm whitespace-nowrap">
                            {new Date(record.date).toLocaleString("tr-TR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </td>
                          <td className="font-medium text-slate-800">
                            {record.product.name}
                            {record.product.code && (
                              <span className="block text-xs font-mono text-slate-400 font-normal mt-0.5">
                                {record.product.code}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded text-sm">
                              {record.quantity.toLocaleString("tr-TR")}
                            </span>
                          </td>
                          <td className="text-slate-500 text-sm max-w-[200px] truncate" title={record.description || ""}>
                            {record.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";

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
  total: number;
}

interface FireClientProps {
  initialRecords: FireRecord[];
  summary: SummaryItem[];
  currentMonth: number;
  currentYear: number;
}

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

export function FireClient({ initialRecords, summary, currentMonth, currentYear }: FireClientProps) {
  const router = useRouter();
  const totalFire = summary.reduce((sum, item) => sum + item.total, 0);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [y, m] = e.target.value.split("-");
    router.push(`/fire?y=${y}&m=${m}`);
  };

  // Son 12 ayı oluştur
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  const currentValue = `${currentYear}-${currentMonth}`;

  return (
    <>
      <div className="page-header flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div>
          <h1 className="page-title">Fire Takibi</h1>
          <p className="text-sm text-slate-500 mt-1">Üretim sırasında oluşan ıskarta / fire miktarları</p>
        </div>
        
        <select
          value={currentValue}
          onChange={handleMonthChange}
          className="form-input max-w-xs bg-white"
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
                  {MONTHS[currentMonth - 1]} {currentYear}
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
                      <li key={item.productId} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                          {item.code && <p className="text-xs font-mono text-slate-400">{item.code}</p>}
                        </div>
                        <div className="text-sm font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md ml-4">
                          {item.total.toLocaleString("tr-TR")}
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

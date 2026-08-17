"use client";

import { useState, useEffect } from "react";
import { getJobSchedules, updateJobSchedule } from "@/lib/actions/is-takibi";
import MachineDetailModal from "./MachineDetailModal";

export default function IsTakibiClient({ machines, products, rawMaterials, initialDate, initialSchedules, ustaToken }: any) {
  const [date, setDate] = useState(initialDate);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);

  useEffect(() => {
    const handleJobUpdate = () => {
      refreshSchedules();
    };
    window.addEventListener("job-schedule-updated", handleJobUpdate);
    return () => window.removeEventListener("job-schedule-updated", handleJobUpdate);
  }, [date]);

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    if (!newDate) return;
    
    setIsLoading(true);
    try {
      const newSchedules = await getJobSchedules(newDate);
      setSchedules(newSchedules);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSchedules = async () => {
    const newSchedules = await getJobSchedules(date);
    setSchedules(newSchedules);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/u/${ustaToken}/is-takibi`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeSchedules = schedules.filter((s: any) => s.status !== "TAMAMLANDI");
  const completedSchedules = schedules.filter((s: any) => s.status === "TAMAMLANDI");

  return (
    <div className="flex-1 overflow-y-auto pb-10">
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Tarih Seçin:</label>
          <input 
            type="date" 
            value={date} 
            onChange={handleDateChange}
            className="border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {isLoading && <span className="text-sm text-gray-500 animate-pulse">Yükleniyor...</span>}
        </div>
        
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors border border-indigo-200"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Kopyalandı!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Ustalar İçin Linki Kopyala
            </>
          )}
        </button>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4">Planlanan İşler</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {machines.map((machine: any) => {
          const machineSchedules = activeSchedules.filter((s: any) => s.machineId === machine.id);
          
          return (
            <div 
              key={machine.id} 
              onClick={() => setSelectedMachine(machine)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
                  {machine.name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${machine.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {machine.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-gray-500 flex items-center justify-between">
                  <span>Planlanan İş:</span>
                  <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{machineSchedules.length}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Detayları Gör &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMachine && (
        <MachineDetailModal 
          machine={selectedMachine} 
          date={date}
          schedules={activeSchedules.filter((s: any) => s.machineId === selectedMachine.id)}
          products={products}
          rawMaterials={rawMaterials}
          onClose={() => setSelectedMachine(null)}
          onRefresh={refreshSchedules}
        />
      )}

      {/* İş Takip Geçmişi */}
      {completedSchedules.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tamamlanan İşler (İş Takip Geçmişi)</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih / Saat</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Makine</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Üretilen Ürün</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Üretim Miktarı</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Harcanan Hammaddeler</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Not</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedSchedules.map((job: any) => {
                    const startD = new Date(job.startTime);
                    const endD = new Date(job.endTime);
                    const timeStr = `${startD.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} ${startD.toTimeString().substring(0, 5)} - ${endD.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} ${endD.toTimeString().substring(0, 5)}`;
                    
                    const product = job.product;
                    const expectedQty = job.expectedQty || 0;
                    
                    // Reçete üzerinden hammadde tüketimi
                    const consumedMaterials = product?.recipes?.filter((r: any) => r.rawMaterialId).map((r: any) => {
                      const rm = rawMaterials.find((m: any) => m.id === r.rawMaterialId);
                      if (!rm) return null;
                      const reqQty = expectedQty * r.quantityPerUnit * (1 + (r.wastePercentage / 100));
                      return { name: rm.name, reqQty, unit: rm.unit || 'kg' };
                    }).filter(Boolean) || [];

                    return (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{timeStr}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{job.machine?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-700">{product?.name || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">{expectedQty} Adet</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {consumedMaterials.length > 0 ? (
                            <ul className="list-disc list-inside text-gray-600">
                              {consumedMaterials.map((m: any, idx: number) => (
                                <li key={idx}><span className="font-semibold text-gray-800">{m.reqQty.toFixed(2)}</span> {m.unit} {m.name}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={job.notes || ""}>{job.notes || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

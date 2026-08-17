"use client";

import { useState } from "react";
import JobModal from "./JobModal";
import { deleteJobSchedule } from "@/lib/actions/is-takibi";

export default function MachineDetailModal({ machine, date, schedules, products, rawMaterials, onClose, onRefresh }: any) {
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm("Bu iş planını silmek istediğinize emin misiniz?")) {
      await deleteJobSchedule(id);
      onRefresh();
    }
  };

  const handleEdit = (job: any) => {
    setSelectedJob(job);
    setIsJobModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedJob(null);
    setIsJobModalOpen(true);
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) + " " + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANLANDI": return "bg-blue-100 text-blue-700 border-blue-200";
      case "DEVAM_EDIYOR": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "TAMAMLANDI": return "bg-green-100 text-green-700 border-green-200";
      case "IPTAL": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PLANLANDI": return "Planlandı";
      case "DEVAM_EDIYOR": return "Devam Ediyor";
      case "TAMAMLANDI": return "Tamamlandı";
      case "IPTAL": return "İptal";
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{machine.name} - İş Detayları</h2>
            <p className="text-sm text-gray-500 mt-1">{new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Planlanan İşler</h3>
            <button 
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              Yeni İş Ekle
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 font-medium">Bu tarihte planlanmış iş bulunmuyor.</p>
              <p className="text-gray-400 text-sm mt-1">Yeni bir iş eklemek için yukarıdaki butonu kullanın.</p>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {schedules.map((schedule: any) => (
                <div key={schedule.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl shadow-sm border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <time className="text-sm font-semibold text-blue-600">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </time>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(schedule.status)}`}>
                        {getStatusLabel(schedule.status)}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="text-sm text-gray-500 mb-1">Ürün:</div>
                      <div className="font-semibold text-gray-800">{schedule.product?.name}</div>
                    </div>
                    {schedule.rawMaterial && (
                      <div className="mb-2">
                        <div className="text-sm text-gray-500 mb-1">Hammadde:</div>
                        <div className="font-medium text-gray-700">{schedule.rawMaterial?.name}</div>
                      </div>
                    )}
                    {schedule.expectedQty && (
                      <div className="mb-2">
                        <div className="text-sm text-gray-500 mb-1">Hedef Miktar:</div>
                        <div className="font-medium text-gray-700">{schedule.expectedQty} Adet</div>
                      </div>
                    )}
                    {schedule.notes && (
                      <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100">
                        {schedule.notes}
                      </div>
                    )}
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(schedule)}
                        className="text-sm px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md font-medium transition-colors"
                      >
                        Düzenle
                      </button>
                      <button 
                        onClick={() => handleDelete(schedule.id)}
                        className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isJobModalOpen && (
        <JobModal 
          machine={machine}
          date={date}
          job={selectedJob}
          products={products}
          rawMaterials={rawMaterials}
          onClose={() => setIsJobModalOpen(false)}
          onRefresh={() => {
            setIsJobModalOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

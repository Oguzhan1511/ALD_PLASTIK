"use client";

import { useState } from "react";

export function UstaWeeklyScheduleClient({ initialStartDate, initialEndDate, initialSchedules, token }: any) {
  const [schedules, setSchedules] = useState(initialSchedules);
  
  // Sadece aktif ve planlanmış/devam eden işleri göster
  const activeSchedules = schedules.filter((s: any) => s.status !== "IPTAL" && s.status !== "TAMAMLANDI");

  // Günleri grupla
  const daysOfWeek = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  
  // schedule'ları günlere ve makinelere göre ayır
  // Basitlik için sadece listeleme yapacağız
  
  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { weekday: 'long' });
  };
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toTimeString().substring(0, 5);
  };

  // İşleri tarihe göre grupla
  const groupedByDate: Record<string, any[]> = {};
  activeSchedules.forEach((schedule: any) => {
    // API'den gelen ISO string'i (UTC) yerel saate çevir
    const d = new Date(schedule.startTime);
    const dateKey = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(schedule);
  });
  
  // Tarihleri sırala
  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Haftalık Üretim Planı</h1>
            <p className="text-blue-100 text-sm mt-0.5">Makineler ve Planlanan İşler</p>
          </div>
          <div className="bg-white/20 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {sortedDates.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100 mt-10">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700">Planlanmış İş Bulunmuyor</h2>
            <p className="text-gray-500 mt-2">Bu hafta için planlanmış herhangi bir üretim bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((dateStr) => {
              const daySchedules = groupedByDate[dateStr];
              
              const now = new Date();
              const todayLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
              const isToday = todayLocal === dateStr;

              return (
                <section key={dateStr} className="relative">
                  <div className={`sticky top-[72px] z-10 py-2 ${isToday ? 'bg-blue-50/90 backdrop-blur-sm' : 'bg-gray-50/90 backdrop-blur-sm'}`}>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <span className={`${isToday ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'} px-3 py-1 rounded-lg shadow-sm`}>
                        {getDayName(dateStr)}
                      </span>
                      <span className="text-sm font-medium text-gray-500">{formatDate(dateStr)}</span>
                      {isToday && <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full uppercase tracking-wider">Bugün</span>}
                    </h2>
                  </div>

                  <div className="mt-4 space-y-4">
                    {daySchedules.map((job) => (
                      <div key={job.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-4 ${job.status === 'DEVAM_EDIYOR' ? 'border-l-yellow-400' : 'border-l-blue-500'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-gray-900 text-lg">{job.machine?.name}</h3>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${job.status === 'DEVAM_EDIYOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                            {job.status === 'DEVAM_EDIYOR' ? 'Devam Ediyor' : 'Planlandı'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ürün</span>
                            <span className="block text-sm font-bold text-gray-800">{job.product?.name}</span>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Miktar</span>
                            <span className="block text-sm font-bold text-gray-800">{job.expectedQty ? `${job.expectedQty} Adet` : '-'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(job.startTime)} - {formatTime(job.endTime)}</span>
                        </div>

                        {job.notes && (
                          <div className="mt-3 text-sm text-gray-600 bg-yellow-50/50 p-3 rounded-lg border border-yellow-100">
                            <strong>Not:</strong> {job.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 p-4 mt-8 text-center text-xs text-gray-400">
        Güncel saat ve verilere göre oluşturulmuştur.
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getJobSchedules, updateJobSchedule } from "@/lib/actions/is-takibi";

export function GlobalJobNotifier() {
  const [activeNotification, setActiveNotification] = useState<{ job: any; type: 'START' | 'END' } | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    
    const checkJobs = async () => {
      if (activeNotification) return;

      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      try {
        const schedules = await getJobSchedules(todayStr);
        if (!isMounted) return;

        for (const job of schedules) {
          if (dismissedNotifications.has(job.id)) continue;

          const startTime = new Date(job.startTime);
          const endTime = new Date(job.endTime);

          if (job.status === "PLANLANDI" && now >= startTime) {
            setActiveNotification({ job, type: 'START' });
            return;
          }

          if (job.status === "DEVAM_EDIYOR" && now >= endTime) {
            setActiveNotification({ job, type: 'END' });
            return;
          }
        }
      } catch (err) {
        console.error("Job check error", err);
      }
    };

    checkJobs();
    const interval = setInterval(checkJobs, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeNotification, dismissedNotifications]);

  const handleNotificationAction = async (accept: boolean) => {
    if (!activeNotification) return;
    const { job, type } = activeNotification;
    
    setActiveNotification(null);
    setDismissedNotifications(prev => new Set(prev).add(job.id));
    
    if (accept) {
      const newStatus = type === 'START' ? "DEVAM_EDIYOR" : "TAMAMLANDI";
      try {
        await updateJobSchedule(job.id, { status: newStatus });
        window.dispatchEvent(new Event("job-schedule-updated"));
      } catch(e) {
        console.error(e);
      }
    }
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 border-l-4 border-blue-500 rounded-lg shadow-2xl p-5 max-w-sm w-full">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {activeNotification.type === 'START' ? (
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {activeNotification.type === 'START' ? 'İş Başlama Zamanı' : 'İş Bitiş Zamanı'}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
              <strong className="text-gray-800 dark:text-slate-100">{activeNotification.job.machine?.name}</strong> için planlanan 
              <strong className="text-gray-800 dark:text-slate-100"> {activeNotification.job.product?.name}</strong> üretiminin 
              {activeNotification.type === 'START' ? ' başlama' : ' bitiş'} zamanı geldi.
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 font-medium">
              Durumu <span className="text-blue-600 dark:text-blue-400">'{activeNotification.type === 'START' ? 'Devam Ediyor' : 'Tamamlandı'}'</span> olarak güncelleyelim mi?
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => handleNotificationAction(true)}
            className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Evet, Güncelle
          </button>
          <button
            onClick={() => handleNotificationAction(false)}
            className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Hayır, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

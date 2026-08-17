"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hatayı console'a yazdır
    console.error("Sayfa Hatası Yakalandı:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-2">Eyvah! Bir Şeyler Ters Gitti</h2>
        <p className="text-gray-500 mb-6 text-sm">
          Bu sayfayı yüklerken beklenmedik bir hatayla karşılaştık. Teknik bir aksaklık olabilir veya sunucu ile iletişim geçici olarak kesilmiş olabilir.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-8 border border-gray-100 text-left overflow-hidden">
          <p className="text-xs text-gray-400 font-mono break-all truncate">
            {error.message || "Bilinmeyen bir hata oluştu."}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}

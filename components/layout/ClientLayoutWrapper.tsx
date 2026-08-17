"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { GlobalJobNotifier } from "./GlobalJobNotifier";

export function ClientLayoutWrapper({
  children,
  hasSession,
}: {
  children: React.ReactNode;
  hasSession: boolean;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isStandalone = pathname?.startsWith("/u/") || pathname === "/login";

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

  if (hasSession && !isStandalone) {
    return (
      <div className={`page-wrapper relative ${isCollapsed ? "collapsed" : ""}`}>
        <Sidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
        />
        
        <main className="main-content">
          {/* Mobile Top Bar */}
          <div className="lg:hidden bg-gray-950 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <img src="/ald-logo-white.png" alt="ALD Plastik Logo" className="h-7 w-auto object-contain" />
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1 rounded-md hover:bg-gray-800 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          {children}
        </main>
        <GlobalJobNotifier />
      </div>
    );
  }

  return <>{children}</>;
}

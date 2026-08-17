"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "./ThemeProvider";

const navItems = [
  {
    href: "/",
    label: "Ana Sayfa",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/hammaddeler",
    label: "Hammaddeler",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/urunler",
    label: "Ürünler & Reçeteler",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/uretim",
    label: "Üretim Girişi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/urun-stok",
    label: "Ürün Stok",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },

  {
    href: "/sevkiyat-girisi",
    label: "Sevkiyat Girişi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  {
    href: "/sevkiyat",
    label: "Sevkiyat Çıkışı",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
  {
    href: "/hareketler",
    label: "Hareket Geçmişi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/raporlar",
    label: "Raporlar & Onaylar",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/is-takibi",
    label: "İş Takibi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function Sidebar({ 
  isOpen = false, 
  onClose,
  isCollapsed = false,
  toggleCollapse
}: { 
  isOpen?: boolean; 
  onClose?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}
      
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Toggle Collapse Button (Desktop Only) */}
        {toggleCollapse && (
          <button 
            onClick={toggleCollapse}
            className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full items-center justify-center text-white hover:text-white hover:bg-gray-700 shadow-md z-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Logo and close button for mobile */}
        <div className={`sidebar-logo relative ${isCollapsed ? 'justify-center px-2' : 'justify-center px-4'}`}>
          <div className="flex items-center justify-center w-full">
            {isCollapsed ? (
              <img 
                src="/ald-logo-square-white.png" 
                alt="ALD" 
                className="h-8 w-auto object-contain"
              />
            ) : (
              <Link href="/" className="flex items-center justify-center py-1">
                <img 
                  src="/ald-logo-white.png" 
                  alt="ALD Plastik Logo" 
                  className="h-9 max-w-[180px] w-auto object-contain"
                />
              </Link>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={onClose} className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""} ${isCollapsed ? "justify-center px-0" : ""}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer space-y-1">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggle}
          className={`nav-link w-full text-left ${isCollapsed ? "justify-center px-0" : ""}`}
          title={theme === "dark" ? "Açık Moda Geç" : "Karanlık Moda Geç"}
        >
          {theme === "dark" ? (
            <>
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14A7 7 0 0012 5z" />
                </svg>
              </div>
              {!isCollapsed && <span className="whitespace-nowrap">Açık Mod</span>}
            </>
          ) : (
            <>
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              {!isCollapsed && <span className="whitespace-nowrap">Karanlık Mod</span>}
            </>
          )}
        </button>

        {/* Çıkış */}
        <button
          onClick={() => signOut({ callbackUrl: "https://ogzsystem.com" })}
          className={`nav-link w-full text-left ${isCollapsed ? "justify-center px-0" : ""}`}
          title={isCollapsed ? "Çıkış Yap" : undefined}
        >
          <div className="flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          {!isCollapsed && <span className="whitespace-nowrap">Çıkış Yap</span>}
        </button>

        {/* Branding - ogzsystem */}
        <div className="pt-6 pb-2">
          <div className="flex flex-row items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-all duration-300 cursor-default">
            <svg className={`w-5 h-5 flex-shrink-0 text-[#0d9488] ${isCollapsed ? 'mb-1' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5 A 8 8 0 1 0 11 4.1" />
            </svg>
            {!isCollapsed && (
              <span 
                className="text-[17px] font-medium text-white whitespace-nowrap" 
                style={{ fontFamily: '"Nunito", "Quicksand", "Varela Round", "Segoe UI", sans-serif', letterSpacing: '-0.02em' }}
              >
                ogzsystem
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

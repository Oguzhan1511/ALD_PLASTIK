import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ALD Plastik — Stok Takip Sistemi",
  description:
    "Hammadde ve reçete bazlı stok takip sistemi. Plastik enjeksiyon üretimi için otomatik stok düşümü.",
  icons: {
    icon: "/ald-logo-square.png",
    apple: "/ald-logo-square.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} font-sans`}>
      <body className="antialiased">
        <ThemeProvider>
          <SessionProvider session={session}>
            <ClientLayoutWrapper hasSession={!!session}>
              {children}
            </ClientLayoutWrapper>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

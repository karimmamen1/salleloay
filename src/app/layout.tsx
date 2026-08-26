import type { Metadata, Viewport } from "next";
import { Cairo, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-latin" });
const cairo = Cairo({ subsets: ["arabic"], variable: "--font-arabic" });

export const metadata: Metadata = {
  title: { default: "Salle des Fêtes Louay", template: "%s · Salle Louay" },
  description: "Gestion interne des réservations de la Salle des Fêtes Louay.",
  applicationName: "Salle Louay",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Salle Louay" },
  icons: { icon: "/icons/louay-192.png", apple: "/icons/louay-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#123f33",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body className={`${manrope.variable} ${cairo.variable}`}><Providers>{children}</Providers></body>
    </html>
  );
}

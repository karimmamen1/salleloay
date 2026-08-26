"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, History, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useOnline } from "@/hooks/use-online";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const nav = [
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
    { href: "/calendar", label: t.calendar, icon: CalendarDays },
    { href: "/reservations", label: t.reservations, icon: ClipboardList },
    ...(profile?.role === "super_admin" ? [
      { href: "/admins", label: t.administrators, icon: Users },
      { href: "/audit", label: t.audit, icon: History },
    ] : []),
  ];
  const doLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setOpen(false);
    try { await logout(); } finally { router.replace("/login"); }
  };
  return <div className="min-h-screen bg-[#f7f4ed] lg:grid lg:grid-cols-[260px_1fr]">
    {!online && <div className="fixed inset-x-0 top-0 z-[80] bg-[#8f342f] px-4 py-2 text-center text-xs font-bold text-white">{t.offlineTitle} {t.offlineBody}</div>}
    <aside className={`fixed inset-y-0 z-50 w-[280px] bg-[#123f33] p-5 text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ${open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"}`} style={{ insetInlineStart: 0 }}>
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo-louay.jpg" alt="Logo Salle des Fêtes Louay" width={48} height={48} priority className="h-12 w-12 rounded-2xl border border-[#d8b77b]/40 object-cover" />
          <span><strong className="block text-sm tracking-[.12em]">SALLE LOUAY</strong><small className="text-white/50">{language === "ar" ? "إدارة الحجوزات" : "Gestion des réservations"}</small></span>
        </Link>
        <button className="rounded-xl p-2 lg:hidden" aria-label={t.close} onClick={() => setOpen(false)}><X /></button>
      </div>
      <nav className="mt-12 space-y-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link onClick={() => setOpen(false)} key={item.href} href={item.href} className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${active ? "bg-white text-[#123f33] shadow-lg" : "text-white/70 hover:bg-white/8 hover:text-white"}`}><item.icon size={20} />{item.label}</Link>;
        })}
      </nav>
      <div className="absolute bottom-6 inset-x-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="font-bold">{profile?.name}</p>
        <p className="mt-1 text-xs text-[#e5cea2]">{profile?.role === "super_admin" ? t.superAdmin : t.admin}</p>
        <button onClick={doLogout} className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/65 hover:text-white"><LogOut size={17} />{t.logout}</button>
      </div>
    </aside>

    <div className="min-w-0 pb-24 lg:pb-0">
      <header className={`sticky z-30 flex h-20 items-center justify-between border-b border-[#e7e1d5] bg-[#f7f4ed]/90 px-4 backdrop-blur-xl sm:px-7 ${!online ? "top-8" : "top-0"}`}>
        <div className="flex items-center gap-3">
          <button className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ded7ca] bg-white lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#b78b47]">{t.hall}</p><h1 className="mt-1 hidden text-lg font-bold text-[#18221f] sm:block">{nav.find((item) => pathname.startsWith(item.href))?.label || t.dashboard}</h1></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="focus-ring rounded-full border border-[#ded7ca] bg-white px-4 py-2 text-sm font-extrabold text-[#123f33]">FR <span className="mx-1 text-[#b5aa98]">|</span> عربي</button>
          <button type="button" onClick={doLogout} disabled={loggingOut} aria-label={t.logout} title={t.logout} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#e3d3d0] bg-white px-3 text-sm font-bold text-[#963f39] transition hover:bg-[#f8e9e7] disabled:opacity-50 md:px-4"><LogOut size={17} /><span className="hidden md:inline">{loggingOut ? "…" : t.logout}</span></button>
          <div className="hidden text-end sm:block"><p className="text-sm font-bold">{profile?.name}</p><p className="text-xs text-[#7b857f]">{profile?.role === "super_admin" ? t.superAdmin : t.admin}</p></div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e6eee9] text-sm font-extrabold text-[#123f33]">{profile?.name?.slice(0, 1).toUpperCase()}</div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-7">{children}</main>
    </div>

    <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-[22px] border border-[#ddd6ca] bg-white/95 p-2 shadow-[0_15px_40px_rgba(30,40,35,.18)] backdrop-blur-xl lg:hidden">
      {nav.slice(0, 5).map((item) => { const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} aria-label={item.label} className={`grid min-h-12 min-w-12 place-items-center rounded-2xl ${active ? "bg-[#123f33] text-white" : "text-[#77817c]"}`}><item.icon size={20} /></Link>; })}
    </nav>
  </div>;
}

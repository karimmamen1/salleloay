"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/auth-context";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !profile) router.replace("/login");
    if (!loading && profile?.role !== "super_admin" && (pathname.startsWith("/admins") || pathname.startsWith("/audit"))) router.replace("/dashboard");
  }, [loading, profile, pathname, router]);
  if (loading || !profile) return <div className="grid min-h-screen place-items-center bg-[#123f33] text-white"><div className="text-center"><Image src="/logo-louay.jpg" alt="Logo Salle des Fêtes Louay" width={76} height={76} priority className="mx-auto h-[76px] w-[76px] animate-pulse rounded-3xl border border-[#d8b77b]/40 object-cover" /><p className="mt-4 text-sm font-bold tracking-[.14em]">SALLE LOUAY</p></div></div>;
  return <AppShell>{children}</AppShell>;
}

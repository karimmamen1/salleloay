"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { db } from "@/lib/firebase/client";
import type { AdminUser } from "@/types";
import { formatTimestamp } from "@/utils/format";

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { language, t } = useLanguage(); const [admin, setAdmin] = useState<AdminUser | null>(null);
  useEffect(() => onSnapshot(doc(db, "users", id), (snap) => setAdmin(snap.exists() ? { uid: snap.id, ...snap.data() } as AdminUser : null)), [id]);
  if (!admin) return <div className="rounded-3xl bg-white p-10 text-center">{t.loading}</div>;
  return <div className="mx-auto max-w-2xl rounded-[28px] border border-[#e5dfd4] bg-white p-7"><button onClick={() => router.back()} className="text-sm font-bold text-[#b78b47]">← {t.administrators}</button><div className="mt-7 flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#e8f0eb] text-2xl font-extrabold text-[#123f33]">{admin.name.slice(0, 1)}</div><div><h2 className="text-2xl font-extrabold">{admin.name}</h2><p className="text-[#78827d]">@{admin.username}</p></div></div><dl className="mt-7 grid gap-4 rounded-2xl bg-[#f7f4ed] p-5 sm:grid-cols-2"><div><dt className="text-xs text-[#808a85]">{t.role}</dt><dd className="mt-1 font-bold">{admin.role === "super_admin" ? t.superAdmin : t.admin}</dd></div><div><dt className="text-xs text-[#808a85]">{t.status}</dt><dd className="mt-1 font-bold">{admin.active ? t.active : t.disabled}</dd></div><div><dt className="text-xs text-[#808a85]">{t.createdOn}</dt><dd className="mt-1 font-bold">{formatTimestamp(admin.createdAt, language)}</dd></div></dl></div>;
}

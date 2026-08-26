"use client";

import { createContext, useContext, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Kind = "success" | "error";
const ToastContext = createContext<{ showToast: (message: string, kind?: Kind) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const showToast = (message: string, kind: Kind = "success") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 4200);
  };
  return <ToastContext.Provider value={{ showToast }}>
    {children}
    {toast && <div role="status" className={`fixed bottom-24 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold text-white shadow-2xl md:bottom-7 ${toast.kind === "success" ? "bg-[#123f33]" : "bg-[#9c342e]"}`} style={{ insetInlineEnd: "1.5rem" }}>
      {toast.kind === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}{toast.message}
    </div>}
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

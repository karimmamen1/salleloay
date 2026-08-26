"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Dialog({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(<div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0e1f19]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px] ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ece7de] bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><h2 className="text-xl font-extrabold text-[#18221f]">{title}</h2><button className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3f0ea] text-[#56615c]" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div>
      {children}
    </div>
  </div>, document.body);
}

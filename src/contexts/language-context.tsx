"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ar } from "@/locales/ar";
import { fr } from "@/locales/fr";
import type { Language } from "@/types";

type Dictionary = typeof fr | typeof ar;
interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; t: Dictionary; }

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");
  useEffect(() => {
    const stored = window.localStorage.getItem("salle-loay-language");
    if (stored === "ar") window.setTimeout(() => setLanguageState("ar"), 0);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("salle-loay-language", language);
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage: setLanguageState, t: language === "ar" ? ar : fr }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

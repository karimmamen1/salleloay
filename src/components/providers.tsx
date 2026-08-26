"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { LanguageProvider } from "@/contexts/language-context";
import { ToastProvider } from "@/contexts/toast-context";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export function Providers({ children }: { children: React.ReactNode }) {
  return <LanguageProvider><AuthProvider><ToastProvider><ServiceWorkerRegistration />{children}</ToastProvider></AuthProvider></LanguageProvider>;
}

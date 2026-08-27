"use client";

import { Eye, EyeOff, LockKeyhole, UserRound, WifiOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useOnline } from "@/hooks/use-online";

export default function LoginPage() {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const online = useOnline();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!online || busy) return;
    setBusy(true); setError("");
    try { await login(username, password); router.replace("/dashboard"); }
    catch (reason) { setError(reason instanceof Error && reason.message === "account-disabled" ? t.disabledAccount : t.invalidCredentials); }
    finally { setBusy(false); }
  };

  const switcher = <button onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="focus-ring rounded-full border border-[#ded7ca] px-4 py-2 text-sm font-bold text-[#123f33]" type="button">FR <span className="mx-1 text-[#b5aa98]">|</span> عربي</button>;
  return (
    <main className="min-h-screen bg-[#f7f4ed] p-4 sm:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[30px] border border-[#e7e1d5] bg-white shadow-[0_30px_80px_rgba(42,50,46,.10)] sm:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#123f33] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full border border-[#d8b77b]/20" />
          <div className="relative flex items-center gap-3">
            <Image src="/logo-louay.jpg" alt="Logo Salle des Fêtes Louay" width={52} height={52} priority className="h-[52px] w-[52px] rounded-2xl border border-[#d8b77b]/40 object-cover" />
            <div>
              <p className="text-sm font-bold tracking-[.14em] text-[#e5cea2]">SALLE LOUAY</p>
              <p className="text-xs text-white/60">Gestion des réservations</p>
            </div>
          </div>
          <div className="relative max-w-xl">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-[#e5cea2]">{t.privateArea}</p>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-.04em] xl:text-6xl">{language === "ar" ? "كل احتفال، منظم بإتقان." : "Chaque célébration, parfaitement organisée."}</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-white/65">{language === "ar" ? "تقويم مباشر، حجوزات واضحة وفريق متزامن دائماً." : "Un calendrier vivant, des réservations claires et toute votre équipe synchronisée."}</p>
          </div>
          <p className="relative text-sm text-white/45">Salle des Fêtes Louay · قاعة الأفراح لؤي</p>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-12 lg:px-20">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Image src="/logo-louay.jpg" alt="Logo Salle des Fêtes Louay" width={48} height={48} priority className="h-12 w-12 rounded-2xl object-cover" />
              {switcher}
            </div>
            <div className="mb-9">
              <p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-[#b78b47]">Administration</p>
              <h2 className="text-4xl font-semibold tracking-[-.04em] text-[#18221f]">{t.welcome}</h2>
              <p className="mt-3 leading-7 text-[#69746f]">{t.loginIntro}</p>
            </div>
            {!online && <div className="mb-5 flex gap-3 rounded-2xl bg-[#fff0ed] p-4 text-sm text-[#8b302b]"><WifiOff className="shrink-0" size={20} /><span><strong className="block">{t.offlineTitle}</strong>{t.offlineBody}</span></div>}
            {error && <div role="alert" className="mb-5 rounded-2xl bg-[#fff0ed] p-4 text-sm font-semibold text-[#8b302b]">{error}</div>}
            <form className="space-y-5" onSubmit={submit}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#293530]">{t.username}</span>
                <span className="relative block">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b958f]" size={19} />
                  <input value={username} onChange={(e) => setUsername(e.target.value)} className="focus-ring h-14 w-full rounded-2xl border border-[#ded7ca] bg-[#fbfaf7] px-12 outline-none transition focus:border-[#b78b47]" autoComplete="username" placeholder="user" required />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#293530]">{t.password}</span>
                <span className="relative block">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b958f]" size={19} />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} className="focus-ring h-14 w-full rounded-2xl border border-[#ded7ca] bg-[#fbfaf7] px-12 outline-none transition focus:border-[#b78b47]" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" required />
                  <button onClick={() => setVisible((value) => !value)} aria-label="Afficher le mot de passe" className="focus-ring absolute top-1/2 -translate-y-1/2 rounded-lg text-[#8b958f] ltr:right-4 rtl:left-4" type="button">{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </span>
              </label>
              <button disabled={!online || busy} className="focus-ring mt-2 h-14 w-full rounded-2xl bg-[#123f33] font-bold text-white shadow-[0_12px_24px_rgba(18,63,51,.20)] transition hover:bg-[#0d3329] disabled:cursor-not-allowed disabled:opacity-50" type="submit">{busy ? t.loading : t.login}</button>
            </form>
            <div className="mt-8 flex items-center justify-between border-t border-[#ece7de] pt-6">
              <p className="text-xs leading-5 text-[#8a938f]">{t.restricted}</p>
              <span className="hidden lg:block">{switcher}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

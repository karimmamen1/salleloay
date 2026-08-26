"use client";

import { Eye, EyeOff, House, KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCheck, Users, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/contexts/toast-context";
import { AdminRequestError, createAdmin, listenToAdmins, listenToReservationCounts, removeAdmin, resetAdminPassword, updateAdmin } from "@/lib/api/admins";
import type { AdminUser } from "@/types";
import { formatTimestamp } from "@/utils/format";

type DialogMode = "create" | "edit" | "password" | null;
const emptyForm = { name: "", username: "", password: "", confirmPassword: "" };
const isStrongPassword = (password: string) => password.length >= 10
  && /[a-z]/.test(password) && /[A-Z]/.test(password)
  && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

export function AdminManagement() {
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const stopAdmins = listenToAdmins(setAdmins);
    const stopCounts = listenToReservationCounts(setCounts);
    return () => { stopAdmins(); stopCounts(); };
  }, []);

  const stats = useMemo(() => ({
    active: admins.filter((admin) => admin.active).length,
    disabled: admins.filter((admin) => !admin.active).length,
    total: admins.length,
  }), [admins]);

  const errorMessage = (error: unknown) => {
    const code = error instanceof AdminRequestError ? error.code : "internal";
    if (code === "username-exists") return t.usernameExists;
    if (code === "weak-password") return t.weakPassword;
    if (["permission-denied", "protected-account", "account-disabled"].includes(code)) return t.permissionDenied;
    return t.genericError;
  };

  const resetDialog = () => {
    if (busy) return;
    setDialog(null);
    setSelected(null);
    setShowPassword(false);
    setFormError("");
    setForm(emptyForm);
  };

  const runAction = async (action: () => Promise<unknown>, success: string, closeAfter = false) => {
    setBusy(true);
    setFormError("");
    try {
      await action();
      showToast(success);
      if (closeAfter) {
        setDialog(null);
        setSelected(null);
        setShowPassword(false);
        setForm(emptyForm);
      }
    } catch (error) {
      const message = errorMessage(error);
      setFormError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = () => {
    if (!isStrongPassword(form.password)) { setFormError(t.weakPassword); return; }
    if (form.password !== form.confirmPassword) { setFormError(t.passwordsMismatch); return; }
    void runAction(() => createAdmin({ name: form.name, username: form.username, password: form.password }), t.adminCreatedSuccess, true);
  };

  const submitPassword = () => {
    if (!selected) return;
    if (!isStrongPassword(form.password)) { setFormError(t.weakPassword); return; }
    if (form.password !== form.confirmPassword) { setFormError(t.passwordsMismatch); return; }
    void runAction(() => resetAdminPassword(selected.uid, form.password), t.passwordChangedSuccess, true);
  };

  const openCreate = () => {
    setSelected(null); setForm(emptyForm); setFormError(""); setShowPassword(false); setDialog("create");
  };
  const openEdit = (admin: AdminUser) => {
    setSelected(admin); setForm({ ...emptyForm, name: admin.name, username: admin.username }); setFormError(""); setDialog("edit");
  };
  const openPassword = (admin: AdminUser) => {
    setSelected(admin); setForm(emptyForm); setFormError(""); setShowPassword(false); setDialog("password");
  };
  const toggleStatus = (admin: AdminUser) => {
    const enabling = !admin.active;
    if (!window.confirm(enabling ? t.enableAdminConfirm : t.disableAdminConfirm)) return;
    void runAction(() => updateAdmin(admin.uid, { active: enabling }), enabling ? t.adminEnabledSuccess : t.adminDisabledSuccess);
  };
  const deleteAccount = (admin: AdminUser) => {
    if (!window.confirm(t.deleteAdminConfirm)) return;
    void runAction(() => removeAdmin(admin.uid), t.adminDeletedSuccess);
  };

  return <div className="space-y-7">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-bold uppercase tracking-[.16em] text-[#b78b47]">{t.superAdmin}</p><h2 className="mt-2 text-3xl font-extrabold text-[#18221f]">{t.adminManagement}</h2></div>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d8c7a8] bg-white px-5 text-sm font-bold text-[#8f682f] transition hover:border-[#b78b47] hover:bg-[#fffaf0]"><House size={18} />{t.home}</Link>
        <button onClick={openCreate} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#123f33] px-5 text-sm font-bold text-white shadow-lg shadow-[#123f33]/10"><Plus size={18} />{t.newAdmin.replace(/^\+\s*/, "")}</button>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-3">
      <Stat icon={UserCheck} label={t.activeAdmins} value={stats.active} tone="green" />
      <Stat icon={UserX} label={t.disabledAdmins} value={stats.disabled} tone="red" />
      <Stat icon={Users} label={t.totalAdmins} value={stats.total} tone="gold" />
    </section>

    <section className="hidden overflow-hidden rounded-[24px] border border-[#e5dfd4] bg-white shadow-[0_8px_25px_rgba(39,48,44,.04)] lg:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[#f2f0ea] text-xs uppercase tracking-[.08em] text-[#6e7973]"><tr>
          <th className="p-4 text-start">{t.fullName}</th><th className="p-4 text-start">{t.username}</th><th className="p-4 text-start">{t.role}</th><th className="p-4 text-start">{t.status}</th><th className="p-4 text-start">{t.createdOn}</th><th className="p-4 text-start">{t.reservationCount}</th><th className="p-4 text-start">{t.actions}</th>
        </tr></thead>
        <tbody>{admins.map((admin) => <tr key={admin.uid} className="border-t border-[#ece7de]">
          <td className="p-4 font-extrabold">{admin.name}</td><td className="p-4 text-[#65716b]">@{admin.username}</td><td className="p-4">{admin.role === "super_admin" ? t.superAdmin : t.admin}</td><td className="p-4"><StatusBadge active={admin.active} activeText={t.active} disabledText={t.disabled} /></td><td className="p-4">{formatTimestamp(admin.createdAt, language)}</td><td className="p-4 font-bold">{(counts[admin.uid] || 0).toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR")}</td><td className="p-4"><AdminActions admin={admin} currentUid={profile?.uid} busy={busy} t={t} onEdit={openEdit} onPassword={openPassword} onToggle={toggleStatus} onDelete={deleteAccount} /></td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 lg:hidden">{admins.map((admin) => <article key={admin.uid} className="rounded-[24px] border border-[#e5dfd4] bg-white p-5 shadow-[0_8px_25px_rgba(39,48,44,.04)]">
      <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${admin.active ? "bg-[#e6f1ea] text-[#24664e]" : "bg-[#f3e6e4] text-[#9a423d]"}`}><ShieldCheck size={22} /></div><div><p className="font-extrabold">{admin.name}</p><p className="mt-1 text-sm text-[#7a847f]">@{admin.username}</p></div></div><StatusBadge active={admin.active} activeText={t.active} disabledText={t.disabled} /></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[#ece7de] py-4 text-xs"><div><dt className="text-[#89928d]">{t.role}</dt><dd className="mt-1 font-bold">{admin.role === "super_admin" ? t.superAdmin : t.admin}</dd></div><div><dt className="text-[#89928d]">{t.createdOn}</dt><dd className="mt-1 font-bold">{formatTimestamp(admin.createdAt, language)}</dd></div><div className="col-span-2"><dt className="text-[#89928d]">{t.reservationCount}</dt><dd className="mt-1 text-lg font-extrabold text-[#123f33]">{(counts[admin.uid] || 0).toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR")}</dd></div></dl>
      <div className="mt-4"><AdminActions admin={admin} currentUid={profile?.uid} busy={busy} t={t} onEdit={openEdit} onPassword={openPassword} onToggle={toggleStatus} onDelete={deleteAccount} /></div>
    </article>)}</section>

    <Dialog open={dialog === "create"} onClose={resetDialog} title={t.newAdmin}>
      <form className="space-y-4 p-6" onSubmit={(event) => { event.preventDefault(); submitCreate(); }}>
        <AdminInput label={t.fullName} value={form.name} onChange={(name) => setForm({ ...form, name })} autoComplete="name" />
        <AdminInput label={t.username} value={form.username} onChange={(username) => setForm({ ...form, username })} pattern="[A-Za-z0-9._-]{3,32}" autoComplete="username" />
        <p className="rounded-xl bg-[#f5f2eb] px-4 py-3 text-sm text-[#64706a]">{t.role}: <strong className="text-[#123f33]">{t.admin}</strong></p>
        <PasswordInput label={t.password} value={form.password} onChange={(password) => setForm({ ...form, password })} visible={showPassword} toggle={() => setShowPassword(!showPassword)} showText={t.showPassword} hideText={t.hidePassword} autoComplete="new-password" />
        <PasswordInput label={t.confirmPassword} value={form.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} visible={showPassword} toggle={() => setShowPassword(!showPassword)} showText={t.showPassword} hideText={t.hidePassword} autoComplete="new-password" />
        <p className="text-xs text-[#76817b]">{t.passwordHint}</p>
        <FormError message={formError} />
        <ModalButtons busy={busy} cancel={t.cancel} submit={t.createAdmin} onCancel={resetDialog} />
      </form>
    </Dialog>

    <Dialog open={dialog === "edit"} onClose={resetDialog} title={t.edit}>
      <form className="space-y-4 p-6" onSubmit={(event) => { event.preventDefault(); if (selected) void runAction(() => updateAdmin(selected.uid, { name: form.name, username: form.username }), t.adminUpdatedSuccess, true); }}>
        <AdminInput label={t.fullName} value={form.name} onChange={(name) => setForm({ ...form, name })} autoComplete="name" />
        <AdminInput label={t.username} value={form.username} onChange={(username) => setForm({ ...form, username })} pattern="[A-Za-z0-9._-]{3,32}" autoComplete="username" />
        <FormError message={formError} />
        <ModalButtons busy={busy} cancel={t.cancel} submit={t.save} onCancel={resetDialog} />
      </form>
    </Dialog>

    <Dialog open={dialog === "password"} onClose={resetDialog} title={t.resetPassword}>
      <form className="space-y-4 p-6" onSubmit={(event) => { event.preventDefault(); submitPassword(); }}>
        <p className="text-sm text-[#6f7a74]">{selected?.name} · @{selected?.username}</p>
        <PasswordInput label={t.newPassword} value={form.password} onChange={(password) => setForm({ ...form, password })} visible={showPassword} toggle={() => setShowPassword(!showPassword)} showText={t.showPassword} hideText={t.hidePassword} autoComplete="new-password" />
        <PasswordInput label={t.confirmPassword} value={form.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} visible={showPassword} toggle={() => setShowPassword(!showPassword)} showText={t.showPassword} hideText={t.hidePassword} autoComplete="new-password" />
        <p className="text-xs text-[#76817b]">{t.passwordHint}</p>
        <FormError message={formError} />
        <ModalButtons busy={busy} cancel={t.cancel} submit={t.resetPassword} onCancel={resetDialog} />
      </form>
    </Dialog>
  </div>;
}

type Dictionary = ReturnType<typeof useLanguage>["t"];

function AdminActions({ admin, currentUid, busy, t, onEdit, onPassword, onToggle, onDelete }: { admin: AdminUser; currentUid?: string; busy: boolean; t: Dictionary; onEdit: (admin: AdminUser) => void; onPassword: (admin: AdminUser) => void; onToggle: (admin: AdminUser) => void; onDelete: (admin: AdminUser) => void }) {
  if (admin.role === "super_admin" || admin.uid === currentUid) return <span className="text-xs font-semibold text-[#9a8260]">{t.superAdmin}</span>;
  const button = "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f0ea] text-[#4d5a54] transition hover:bg-[#e8e4db] disabled:opacity-40";
  return <div className="flex flex-wrap gap-2">
    <button type="button" className={button} onClick={() => onEdit(admin)} title={t.edit} aria-label={t.edit}><Pencil size={16} /></button>
    <button type="button" className={button} onClick={() => onPassword(admin)} title={t.resetPassword} aria-label={t.resetPassword}><KeyRound size={16} /></button>
    <button type="button" disabled={busy} className={button} onClick={() => onToggle(admin)} title={admin.active ? t.disable : t.enable} aria-label={admin.active ? t.disable : t.enable}>{admin.active ? <UserX size={16} /> : <UserCheck size={16} />}</button>
    <button type="button" disabled={busy} className={`${button} bg-[#f5e5e3] text-[#9b3e38] hover:bg-[#edd8d5]`} onClick={() => onDelete(admin)} title={t.delete} aria-label={t.delete}><Trash2 size={16} /></button>
  </div>;
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "green" | "red" | "gold" }) {
  const colors = { green: "bg-[#e6f1ea] text-[#24664e]", red: "bg-[#f3e6e4] text-[#9a423d]", gold: "bg-[#f6eddd] text-[#9b7133]" };
  return <div className="rounded-[22px] border border-[#e5dfd4] bg-white p-5"><div className={`grid h-11 w-11 place-items-center rounded-2xl ${colors[tone]}`}><Icon size={20} /></div><p className="mt-4 text-sm font-semibold text-[#7a847f]">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>;
}

function StatusBadge({ active, activeText, disabledText }: { active: boolean; activeText: string; disabledText: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${active ? "bg-[#e6f1ea] text-[#24664e]" : "bg-[#f3e6e4] text-[#9a423d]"}`}>{active ? activeText : disabledText}</span>;
}

function AdminInput({ label, value, onChange, pattern, autoComplete }: { label: string; value: string; onChange: (value: string) => void; pattern?: string; autoComplete?: string }) {
  return <label className="block text-sm font-bold">{label}<input required minLength={2} maxLength={120} pattern={pattern} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-4 outline-none focus:border-[#b78b47]" /></label>;
}

function PasswordInput({ label, value, onChange, visible, toggle, showText, hideText, autoComplete }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; toggle: () => void; showText: string; hideText: string; autoComplete: string }) {
  return <label className="block text-sm font-bold">{label}<span className="relative mt-2 block"><input required minLength={10} maxLength={128} autoComplete={autoComplete} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-4 pe-12 outline-none focus:border-[#b78b47]" /><button type="button" onClick={toggle} className="absolute inset-y-0 grid w-11 place-items-center text-[#69746e]" style={{ insetInlineEnd: 0 }} title={visible ? hideText : showText} aria-label={visible ? hideText : showText}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>;
}

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-xl bg-[#f8e7e5] px-4 py-3 text-sm font-semibold text-[#983d37]">{message}</p> : null;
}

function ModalButtons({ busy, cancel, submit, onCancel }: { busy: boolean; cancel: string; submit: string; onCancel: () => void }) {
  return <div className="flex gap-3 border-t border-[#ece7de] pt-5"><button type="button" disabled={busy} onClick={onCancel} className="h-12 flex-1 rounded-xl border border-[#ded7ca] font-bold text-[#59645f] disabled:opacity-50">{cancel}</button><button disabled={busy} className="h-12 flex-[1.4] rounded-xl bg-[#123f33] font-bold text-white disabled:opacity-50">{busy ? "…" : submit}</button></div>;
}

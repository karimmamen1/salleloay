"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { reservationSchema } from "@/schemas/reservation";
import type { Reservation, ReservationInput } from "@/types";
import { useLanguage } from "@/contexts/language-context";
import { formatMoney, todayAlgiers } from "@/utils/format";

type FormValues = z.input<typeof reservationSchema>;
const numeric = { valueAsNumber: true } as const;

export function ReservationForm({ date, reservation, busy, onCancel, onSubmit }: { date: string; reservation?: Reservation; busy: boolean; onCancel: () => void; onSubmit: (data: ReservationInput) => Promise<void> }) {
  const { language, t } = useLanguage();
  const defaults: FormValues = reservation ? { ...reservation } : { reservationDate: date, customerName: "", phone: "", eventType: "wedding", customEventType: null, guestCount: 0, totalCost: 0, advancePayment: 0, cookName: "", cookCost: 0, serverCount: 0, cleaningCost: 0 };
  const { register, handleSubmit, control, formState: { errors, isDirty } } = useForm<FormValues>({ resolver: zodResolver(reservationSchema), defaultValues: defaults });
  const [watchedTotal, watchedAdvance, eventType] = useWatch({ control, name: ["totalCost", "advancePayment", "eventType"] });
  const total = Number(watchedTotal) || 0;
  const advance = Number(watchedAdvance) || 0;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (isDirty) event.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const fieldClass = "focus-ring mt-2 h-12 w-full rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-3 outline-none focus:border-[#b78b47]";
  const label = "block text-sm font-bold text-[#36413c]";
  const error = (name: keyof FormValues) => errors[name] ? <small className="mt-1 block text-[#a33a34]">{t.fieldsRequired}</small> : null;
  const close = () => { if (!isDirty || window.confirm(t.unsaved)) onCancel(); };
  const submit = handleSubmit(async (values) => onSubmit(reservationSchema.parse(values) as ReservationInput));
  return <form onSubmit={submit} className="p-5 sm:p-7">
    <FormSection title={t.clientSection}>
      <label className={label}>{t.customer}<input className={fieldClass} {...register("customerName")} autoFocus />{error("customerName")}</label>
      <label className={label}>{t.phone}<input className={fieldClass} {...register("phone")} inputMode="tel" placeholder="0555123456" />{error("phone")}</label>
      <label className={label}>{t.eventType}<select className={fieldClass} {...register("eventType")}>{Object.entries(t.weddings).map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
      <label className={label}>{t.guests}<input className={fieldClass} {...register("guestCount", numeric)} type="number" min="0" inputMode="numeric" />{error("guestCount")}</label>
      {eventType === "other" && <label className={`${label} sm:col-span-2`}>{t.specifyType}<input className={fieldClass} {...register("customEventType")} />{error("customEventType")}</label>}
    </FormSection>

    <FormSection title={t.reservationSection}>
      <label className={label}>{t.reservationDate}<input className={fieldClass} {...register("reservationDate")} type="date" min={reservation ? undefined : todayAlgiers()} />{error("reservationDate")}</label>
      <label className={label}>{t.totalCost}<MoneyField className={fieldClass} registration={register("totalCost", numeric)} />{error("totalCost")}</label>
      <label className={label}>{t.advance}<MoneyField className={fieldClass} registration={register("advancePayment", numeric)} />{error("advancePayment")}</label>
      <div className="rounded-2xl bg-[#eaf2ee] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#587068]">{t.remaining}</p><p className="mt-2 text-2xl font-extrabold text-[#123f33]">{formatMoney(Math.max(total - advance, 0), language)}</p></div>
    </FormSection>

    <FormSection title={t.servicesSection}>
      <label className={label}>{t.cook}<input className={fieldClass} {...register("cookName")} /></label>
      <label className={label}>{t.cookCost}<MoneyField className={fieldClass} registration={register("cookCost", numeric)} />{error("cookCost")}</label>
      <label className={label}>{t.servers}<input className={fieldClass} {...register("serverCount", numeric)} type="number" min="0" inputMode="numeric" />{error("serverCount")}</label>
      <label className={label}>{t.cleaning}<MoneyField className={fieldClass} registration={register("cleaningCost", numeric)} />{error("cleaningCost")}</label>
    </FormSection>
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-7 flex gap-3 border-t border-[#ece7de] bg-white p-5 sm:-mx-7 sm:-mb-7 sm:px-7">
      <button disabled={busy} className="h-12 flex-1 rounded-xl border border-[#ded7ca] font-bold text-[#59645f]" type="button" onClick={close}>{t.cancel}</button>
      <button disabled={busy} className="h-12 flex-[1.4] rounded-xl bg-[#123f33] font-bold text-white disabled:opacity-50" type="submit">{busy ? t.saving : t.save}</button>
    </div>
  </form>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <fieldset className="mb-7"><legend className="mb-4 w-full border-b border-[#ece7de] pb-3 text-xs font-extrabold uppercase tracking-[.15em] text-[#b78b47]">{title}</legend><div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>; }
function MoneyField({ className, registration }: { className: string; registration: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]> }) { return <span className="relative block"><input className={`${className} pe-14`} {...registration} type="number" min="0" step="1" inputMode="numeric" /><span className="absolute top-[1.25rem] text-xs font-extrabold text-[#8b958f]" style={{ insetInlineEnd: ".9rem" }}>DZD</span></span>; }

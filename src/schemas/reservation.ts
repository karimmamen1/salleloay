import { z } from "zod";

const numberField = z.coerce.number().min(0);
export const reservationSchema = z.object({
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(\+213|0)[5-7][0-9]{8}$/),
  eventType: z.enum(["wedding", "engagement", "circumcision", "birthday", "reception", "other"]),
  customEventType: z.string().trim().max(80).nullable().optional(),
  guestCount: numberField.int(),
  totalCost: numberField,
  advancePayment: numberField,
  cookName: z.string().trim().max(120).optional(),
  cookCost: numberField,
  serverCount: numberField.int(),
  cleaningCost: numberField,
}).refine((data) => data.advancePayment <= data.totalCost, { path: ["advancePayment"], message: "advance-too-high" })
  .refine((data) => data.eventType !== "other" || Boolean(data.customEventType), { path: ["customEventType"], message: "required" });

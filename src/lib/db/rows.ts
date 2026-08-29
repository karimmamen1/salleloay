import type { AdminUser, AuditLog, Reservation } from "@/types";

type Row = Record<string, unknown>;
const text = (value: unknown) => value == null ? "" : String(value);
const dateOnly = (value: unknown) => {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value);
  const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};
const timestamp = (value: unknown) => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function adminFromRow(row: Row): AdminUser {
  return {
    uid: text(row.uid ?? row.id),
    name: text(row.name),
    username: text(row.username),
    usernameLower: text(row.usernameLower ?? row.username_lower),
    role: row.role === "super_admin" ? "super_admin" : "admin",
    active: row.active === true,
    createdAt: timestamp(row.createdAt ?? row.created_at),
    createdBy: row.createdBy == null && row.created_by == null ? undefined : text(row.createdBy ?? row.created_by),
    reservationCount: row.reservationCount == null && row.reservation_count == null ? undefined : Number(row.reservationCount ?? row.reservation_count),
  };
}

export function reservationFromRow(row: Row): Reservation {
  return {
    reservationDate: dateOnly(row.reservationDate ?? row.reservation_date),
    customerName: text(row.customerName ?? row.customer_name),
    phone: text(row.phone),
    eventType: row.eventType === "engagement" || row.event_type === "engagement" ? "engagement"
      : row.eventType === "circumcision" || row.event_type === "circumcision" ? "circumcision"
        : row.eventType === "birthday" || row.event_type === "birthday" ? "birthday"
          : row.eventType === "reception" || row.event_type === "reception" ? "reception"
            : row.eventType === "other" || row.event_type === "other" ? "other" : "wedding",
    customEventType: row.customEventType == null && row.custom_event_type == null ? null : text(row.customEventType ?? row.custom_event_type),
    guestCount: Number(row.guestCount ?? row.guest_count),
    totalCost: Number(row.totalCost ?? row.total_cost),
    advancePayment: Number(row.advancePayment ?? row.advance_payment),
    cookName: text(row.cookName ?? row.cook_name),
    djName: text(row.djName ?? row.dj_name),
    djType: row.djType === "internal" || row.dj_type === "internal" ? "internal" : "outsider",
    serverCount: Number(row.serverCount ?? row.server_count),
    cleaningCount: Number(row.cleaningCount ?? row.cleaning_count ?? 0),
    createdByUserId: text(row.createdByUserId ?? row.created_by_user_id),
    createdByName: text(row.createdByName ?? row.created_by_name),
    createdAt: timestamp(row.createdAt ?? row.created_at),
    updatedByUserId: text(row.updatedByUserId ?? row.updated_by_user_id),
    updatedByName: text(row.updatedByName ?? row.updated_by_name),
    updatedAt: timestamp(row.updatedAt ?? row.updated_at),
  };
}

export function auditFromRow(row: Row): AuditLog {
  const fields = row.changedFields ?? row.changed_fields;
  return {
    id: text(row.id),
    action: text(row.action),
    performedByUserId: text(row.performedByUserId ?? row.performed_by_user_id),
    performedByName: text(row.performedByName ?? row.performed_by_name),
    reservationId: row.reservationId == null && row.reservation_id == null ? undefined : dateOnly(row.reservationId ?? row.reservation_id),
    targetUserId: row.targetUserId == null && row.target_user_id == null ? undefined : text(row.targetUserId ?? row.target_user_id),
    timestamp: timestamp(row.timestamp ?? row.created_at),
    changedFields: Array.isArray(fields) ? fields.map(String) : undefined,
  };
}

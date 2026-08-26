import type { AdminUser, AuditLog, Reservation } from "@/types";

type Row = Record<string, unknown>;
const text = (value: unknown) => value == null ? "" : String(value);
const timestamp = (value: unknown) => value == null ? null : new Date(String(value)).toISOString();

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
    reservationDate: text(row.reservationDate ?? row.reservation_date).slice(0, 10),
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
    cookCost: Number(row.cookCost ?? row.cook_cost),
    serverCount: Number(row.serverCount ?? row.server_count),
    cleaningCost: Number(row.cleaningCost ?? row.cleaning_cost),
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
    reservationId: row.reservationId == null && row.reservation_id == null ? undefined : text(row.reservationId ?? row.reservation_id).slice(0, 10),
    targetUserId: row.targetUserId == null && row.target_user_id == null ? undefined : text(row.targetUserId ?? row.target_user_id),
    timestamp: timestamp(row.timestamp ?? row.created_at),
    changedFields: Array.isArray(fields) ? fields.map(String) : undefined,
  };
}


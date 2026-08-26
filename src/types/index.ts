import type { Timestamp } from "firebase/firestore";

export type Language = "fr" | "ar";
export type UserRole = "super_admin" | "admin";
export type EventType = "wedding" | "engagement" | "circumcision" | "birthday" | "reception" | "other";

export interface AdminUser {
  uid: string;
  name: string;
  username: string;
  usernameLower: string;
  role: UserRole;
  active: boolean;
  createdAt?: Timestamp | null;
  createdBy?: string;
  reservationCount?: number;
}

export interface Reservation {
  reservationDate: string;
  customerName: string;
  phone: string;
  eventType: EventType;
  customEventType?: string | null;
  guestCount: number;
  totalCost: number;
  advancePayment: number;
  cookName?: string;
  cookCost: number;
  serverCount: number;
  cleaningCost: number;
  createdByUserId: string;
  createdByName: string;
  createdAt?: Timestamp | null;
  updatedByUserId: string;
  updatedByName: string;
  updatedAt?: Timestamp | null;
}

export interface AuditLog {
  id: string;
  action: string;
  performedByUserId: string;
  performedByName: string;
  reservationId?: string;
  targetUserId?: string;
  timestamp?: Timestamp | null;
  changedFields?: string[];
}

export interface ReservationInput {
  reservationDate: string;
  customerName: string;
  phone: string;
  eventType: EventType;
  customEventType?: string | null;
  guestCount: number;
  totalCost: number;
  advancePayment: number;
  cookName?: string;
  cookCost: number;
  serverCount: number;
  cleaningCost: number;
}

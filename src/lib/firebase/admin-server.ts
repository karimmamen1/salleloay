import "server-only";

import { applicationDefault, getApps, initializeApp, refreshToken, type App, type Credential } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const appName = "salle-loay-admin-server";

interface FirebaseCliConfig {
  user?: { email?: string };
  tokens?: { refresh_token?: string };
}

export class AdminApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message = code) {
    super(message);
  }
}

function serverCredential(): Credential {
  if (process.env.FIREBASE_USE_CLI_CREDENTIALS !== "true") return applicationDefault();

  const configPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
  const config = JSON.parse(readFileSync(configPath, "utf8")) as FirebaseCliConfig;
  const expectedEmail = process.env.FIREBASE_ADMIN_CLI_EMAIL;
  if (expectedEmail && config.user?.email !== expectedEmail) {
    throw new Error(`Firebase CLI must be authenticated as ${expectedEmail}.`);
  }
  if (!config.tokens?.refresh_token) throw new Error("Firebase CLI refresh token is missing. Run firebase login --reauth.");

  const require = createRequire(import.meta.url);
  const firebaseApi = require("firebase-tools/lib/api") as { clientId: () => string; clientSecret: () => string };
  return refreshToken({
    type: "authorized_user",
    client_id: firebaseApi.clientId(),
    client_secret: firebaseApi.clientSecret(),
    refresh_token: config.tokens.refresh_token,
  });
}

function serverApp(): App {
  const existing = getApps().find((app) => app.name === appName);
  if (existing) return existing;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.");
  return initializeApp({ credential: serverCredential(), projectId }, appName);
}

export const adminAuth = () => getAuth(serverApp());

export const serverTimestamp = Symbol("serverTimestamp");
type FirestoreData = Record<string, unknown>;
interface RestDocument { name: string; fields?: Record<string, RestValue>; }
type RestValue = { stringValue?: string; booleanValue?: boolean; integerValue?: string; doubleValue?: number; nullValue?: null; timestampValue?: string; mapValue?: { fields?: Record<string, RestValue> }; arrayValue?: { values?: RestValue[] } };
type RestWrite = Record<string, unknown>;

const projectId = () => process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const documentName = (path: string) => `projects/${projectId()}/databases/(default)/documents/${path}`;
const firestoreUrl = (suffix: string) => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents${suffix}`;

async function accessToken() {
  const credential = serverApp().options.credential;
  if (!credential) throw new Error("Firebase Admin credential is unavailable.");
  return (await credential.getAccessToken()).access_token;
}

async function firestoreRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 409 || body.includes("ALREADY_EXISTS")) throw new AdminApiError(409, "username-exists");
    throw new Error(`Firestore REST ${response.status}: ${body}`);
  }
  return response.json() as Promise<unknown>;
}

function encodeValue(value: unknown): RestValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === "object") return { mapValue: { fields: encodeFields(value as FirestoreData) } };
  throw new Error("Unsupported Firestore value.");
}

function encodeFields(data: FirestoreData) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== serverTimestamp && value !== undefined).map(([key, value]) => [key, encodeValue(value)]));
}

function decodeValue(value: RestValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields: Record<string, RestValue>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

export async function firestoreGet(path: string): Promise<FirestoreData | null> {
  const document = await firestoreRequest(firestoreUrl(`/${path}`)) as RestDocument | null;
  return document ? decodeFields(document.fields || {}) : null;
}

function timestampTransforms(data: FirestoreData) {
  return Object.entries(data).filter(([, value]) => value === serverTimestamp).map(([fieldPath]) => ({ fieldPath, setToServerValue: "REQUEST_TIME" }));
}

export function createWrite(path: string, data: FirestoreData): RestWrite {
  return { update: { name: documentName(path), fields: encodeFields(data) }, currentDocument: { exists: false }, updateTransforms: timestampTransforms(data) };
}

export function updateWrite(path: string, data: FirestoreData): RestWrite {
  const fieldPaths = Object.keys(data).filter((key) => data[key] !== serverTimestamp && data[key] !== undefined);
  return { update: { name: documentName(path), fields: encodeFields(data) }, updateMask: { fieldPaths }, currentDocument: { exists: true }, updateTransforms: timestampTransforms(data) };
}

export function deleteWrite(path: string): RestWrite {
  return { delete: documentName(path), currentDocument: { exists: true } };
}

export function randomDocumentPath(collection: string) {
  return `${collection}/${randomBytes(15).toString("hex")}`;
}

export async function firestoreCommit(writes: RestWrite[]) {
  await firestoreRequest(firestoreUrl(":commit"), { method: "POST", body: JSON.stringify({ writes }) });
}

export interface SuperAdminCaller {
  uid: string;
  name: string;
  token: DecodedIdToken;
}

export async function requireSuperAdmin(request: Request): Promise<SuperAdminCaller> {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) throw new AdminApiError(401, "unauthenticated");

  let token: DecodedIdToken;
  try {
    token = await adminAuth().verifyIdToken(idToken, true);
  } catch {
    throw new AdminApiError(401, "unauthenticated");
  }

  const profile = await firestoreGet(`users/${token.uid}`);
  if (!profile || profile.active !== true) throw new AdminApiError(403, "account-disabled");
  if (token.role !== "super_admin" || profile.role !== "super_admin") {
    throw new AdminApiError(403, "permission-denied");
  }
  return { uid: token.uid, name: String(profile.name || "Super Admin"), token };
}

export function auditRecord(caller: SuperAdminCaller, action: string, extra: FirestoreData = {}) {
  return {
    action,
    performedByUserId: caller.uid,
    performedByName: caller.name,
    timestamp: serverTimestamp,
    ...extra,
  };
}

export function jsonError(error: unknown): Response {
  if (error instanceof AdminApiError) {
    return Response.json({ error: { code: error.code } }, { status: error.status });
  }
  const code = (error as { code?: string })?.code;
  if (code === "auth/email-already-exists" || code === "auth/uid-already-exists") {
    return Response.json({ error: { code: "username-exists" } }, { status: 409 });
  }
  if (code === "auth/invalid-password" || code === "auth/weak-password") {
    return Response.json({ error: { code: "weak-password" } }, { status: 400 });
  }
  console.error("Admin API failure", error);
  return Response.json({ error: { code: "internal" } }, { status: 500 });
}

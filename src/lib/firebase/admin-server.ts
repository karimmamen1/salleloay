import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const projectNumber = "372599098824";
const workloadPoolId = "vercel-salle-louay";
const workloadProviderId = "vercel";
const serviceAccountEmail = "vercel-salle-louay@salle-loay-gestion-2026.iam.gserviceaccount.com";
const credentialContext = new AsyncLocalStorage<() => Promise<string>>();

interface FirebaseCliConfig {
  user?: { email?: string };
  tokens?: { access_token?: string; expires_at?: number; refresh_token?: string };
}

interface FirebaseUserRecord {
  localId: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
  customAttributes?: string;
}

export class AdminApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message = code) {
    super(message);
  }
}

let localToken: { value: string; expiresAt: number } | undefined;
async function localAccessToken(): Promise<string> {
  if (localToken && localToken.expiresAt > Date.now() + 60_000) return localToken.value;
  if (process.env.FIREBASE_USE_CLI_CREDENTIALS !== "true") {
    throw new Error("No Google server credential is configured for this environment.");
  }

  const configPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
  const config = JSON.parse(readFileSync(configPath, "utf8")) as FirebaseCliConfig;
  const expectedEmail = process.env.FIREBASE_ADMIN_CLI_EMAIL;
  if (expectedEmail && config.user?.email !== expectedEmail) throw new Error(`Firebase CLI must be authenticated as ${expectedEmail}.`);
  if (config.tokens?.access_token && Number(config.tokens.expires_at) > Date.now() + 60_000) {
    localToken = { value: config.tokens.access_token, expiresAt: Number(config.tokens.expires_at) };
    return localToken.value;
  }
  if (!config.tokens?.refresh_token) throw new Error("Firebase CLI refresh token is missing. Run firebase login --reauth.");
  const clientId = process.env.FIREBASE_CLI_CLIENT_ID;
  const clientSecret = process.env.FIREBASE_CLI_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Firebase CLI OAuth client settings are missing.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: config.tokens.refresh_token, grant_type: "refresh_token" }),
  });
  if (!response.ok) throw new Error(`Local OAuth refresh failed: ${response.status}`);
  const result = await response.json() as { access_token: string; expires_in: number };
  localToken = { value: result.access_token, expiresAt: Date.now() + result.expires_in * 1000 };
  return localToken.value;
}

function vercelAccessToken(oidcToken: string): () => Promise<string> {
  let cached: { value: string; expiresAt: number } | undefined;
  return async () => {
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
    const audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${workloadPoolId}/providers/${workloadProviderId}`;
    const tokenExchange = await fetch("https://sts.googleapis.com/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        audience,
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
        scope: "https://www.googleapis.com/auth/cloud-platform",
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        subject_token: oidcToken,
      }),
    });
    if (!tokenExchange.ok) throw new Error(`Vercel OIDC exchange failed: ${tokenExchange.status} ${await tokenExchange.text()}`);
    const federated = await tokenExchange.json() as { access_token: string };
    const impersonation = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`, {
      method: "POST",
      headers: { Authorization: `Bearer ${federated.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/cloud-platform"], lifetime: "3600s" }),
    });
    if (!impersonation.ok) throw new Error(`Service account impersonation failed: ${impersonation.status} ${await impersonation.text()}`);
    const access = await impersonation.json() as { accessToken: string; expireTime: string };
    cached = { value: access.accessToken, expiresAt: Date.parse(access.expireTime) };
    return cached.value;
  };
}

export async function withAdminContext<T>(request: Request, operation: () => Promise<T>): Promise<T> {
  const oidcToken = request.headers.get("x-vercel-oidc-token");
  return credentialContext.run(oidcToken ? vercelAccessToken(oidcToken) : localAccessToken, operation);
}

async function accessToken() {
  return (credentialContext.getStore() || localAccessToken)();
}

const projectId = () => process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salle-loay-gestion-2026";
const apiKey = () => process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB3YTmWY9gj50Qu6aq2IBAcsoWaZ8kvmX4";
const identityBase = () => `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/accounts`;

async function identityAdminRequest(path: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${identityBase()}${path}?key=${apiKey()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } } & Record<string, unknown>;
  if (!response.ok) {
    const message = String(body.error?.message || "");
    if (message.includes("EMAIL_EXISTS")) throw new AdminApiError(409, "username-exists");
    if (message.includes("USER_NOT_FOUND") || message.includes("EMAIL_NOT_FOUND")) throw new AdminApiError(404, "admin-not-found");
    throw new Error(`Identity Toolkit ${response.status}: ${message}`);
  }
  return body;
}

export async function createAuthUser(data: { email: string; password: string; displayName: string }): Promise<FirebaseUserRecord> {
  return identityAdminRequest("", { ...data, emailVerified: true, disabled: false }) as Promise<unknown> as Promise<FirebaseUserRecord>;
}

export async function updateAuthUser(uid: string, data: { displayName?: string; email?: string; password?: string; disabled?: boolean; customClaims?: Record<string, unknown> }) {
  return identityAdminRequest(":update", {
    localId: uid,
    ...(data.displayName ? { displayName: data.displayName } : {}),
    ...(data.email ? { email: data.email } : {}),
    ...(data.password ? { password: data.password } : {}),
    ...(typeof data.disabled === "boolean" ? { disableUser: data.disabled } : {}),
    ...(data.customClaims ? { customAttributes: JSON.stringify(data.customClaims) } : {}),
  });
}

export async function deleteAuthUser(uid: string) {
  return identityAdminRequest(":delete", { localId: uid });
}

export async function getAuthUserByEmail(email: string): Promise<FirebaseUserRecord | null> {
  try {
    const result = await identityAdminRequest(":lookup", { email: [email] }) as { users?: FirebaseUserRecord[] };
    return result.users?.[0] || null;
  } catch (error) {
    if (error instanceof AdminApiError && error.code === "admin-not-found") return null;
    throw error;
  }
}

async function lookupCaller(idToken: string): Promise<FirebaseUserRecord> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
  if (!response.ok) throw new AdminApiError(401, "unauthenticated");
  const result = await response.json() as { users?: FirebaseUserRecord[] };
  const user = result.users?.[0];
  if (!user || user.disabled) throw new AdminApiError(401, "unauthenticated");
  return user;
}

export const serverTimestamp = Symbol("serverTimestamp");
type FirestoreData = Record<string, unknown>;
interface RestDocument { name: string; fields?: Record<string, RestValue>; }
type RestValue = { stringValue?: string; booleanValue?: boolean; integerValue?: string; doubleValue?: number; nullValue?: null; timestampValue?: string; mapValue?: { fields?: Record<string, RestValue> }; arrayValue?: { values?: RestValue[] } };
type RestWrite = Record<string, unknown>;

const documentName = (path: string) => `projects/${projectId()}/databases/(default)/documents/${path}`;
const firestoreUrl = (suffix: string) => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents${suffix}`;

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
}

export async function requireSuperAdmin(request: Request): Promise<SuperAdminCaller> {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) throw new AdminApiError(401, "unauthenticated");

  const user = await lookupCaller(idToken);
  const claims = JSON.parse(user.customAttributes || "{}") as { role?: string };
  const profile = await firestoreGet(`users/${user.localId}`);
  if (!profile || profile.active !== true) throw new AdminApiError(403, "account-disabled");
  if (claims.role !== "super_admin" || profile.role !== "super_admin") throw new AdminApiError(403, "permission-denied");
  return { uid: user.localId, name: String(profile.name || "Super Admin") };
}

export function auditRecord(caller: SuperAdminCaller, action: string, extra: FirestoreData = {}) {
  return { action, performedByUserId: caller.uid, performedByName: caller.name, timestamp: serverTimestamp, ...extra };
}

export function jsonError(error: unknown): Response {
  if (error instanceof AdminApiError) return Response.json({ error: { code: error.code } }, { status: error.status });
  console.error("Admin API failure", error);
  return Response.json({ error: { code: "internal" } }, { status: 500 });
}

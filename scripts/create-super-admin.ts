import { applicationDefault, getApps, initializeApp, refreshToken } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createRequire } from "node:module";

function setupCredential() {
  if (process.env.FIREBASE_USE_CLI_CREDENTIALS !== "true") return applicationDefault();
  const configPath = `${homedir()}/.config/configstore/firebase-tools.json`;
  const config = JSON.parse(readFileSync(configPath, "utf8")) as { user?: { email?: string }; tokens?: { refresh_token?: string } };
  if (config.user?.email !== "salleloay1@gmail.com" || !config.tokens?.refresh_token) throw new Error("Firebase CLI must be logged in as salleloay1@gmail.com.");
  const require = createRequire(import.meta.url);
  const api = require("firebase-tools/lib/api") as { clientId: () => string; clientSecret: () => string };
  return refreshToken({ type: "authorized_user", client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: config.tokens.refresh_token });
}

async function writeWithCliCredentials(projectId: string, uid: string, name: string, username: string) {
  const configPath = `${homedir()}/.config/configstore/firebase-tools.json`;
  const config = JSON.parse(readFileSync(configPath, "utf8")) as { tokens?: { access_token?: string; expires_at?: number } };
  if (!config.tokens?.access_token || Number(config.tokens.expires_at || 0) <= Date.now()) throw new Error("Firebase CLI token expired. Run firebase login --reauth.");
  const base = `projects/${projectId}/databases/(default)/documents`;
  const response = await fetch(`https://firestore.googleapis.com/v1/${base}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.tokens.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: [
      { update: { name: `${base}/users/${uid}`, fields: { name: { stringValue: name }, username: { stringValue: username }, usernameLower: { stringValue: username }, role: { stringValue: "super_admin" }, active: { booleanValue: true }, createdBy: { stringValue: "system" } } }, updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }] },
      { update: { name: `${base}/usernames/${username}`, fields: { uid: { stringValue: uid } } }, updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }] },
    ] }),
  });
  if (!response.ok) throw new Error(`Firestore bootstrap failed: ${response.status} ${await response.text()}`);
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Set FIREBASE_PROJECT_ID before running this command.");
  const rl = createInterface({ input: stdin, output: stdout });
  const name = (process.env.SUPER_ADMIN_NAME || await rl.question("Name [Hani]: ")).trim() || "Hani";
  const username = (process.env.SUPER_ADMIN_USERNAME || await rl.question("Username [hani]: ")).trim().toLowerCase() || "hani";
  const password = process.env.SUPER_ADMIN_PASSWORD || await rl.question("Password (input is visible; prefer SUPER_ADMIN_PASSWORD): ");
  rl.close();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("Username must contain 3-32 letters, numbers, dots, underscores or hyphens.");
  if (password.length < 12) throw new Error("Use a password with at least 12 characters.");

  if (!getApps().length) initializeApp({ credential: setupCredential(), projectId });
  const auth = getAuth(); const email = `${username}@auth.salle-loay.local`;
  let user;
  try { user = await auth.getUserByEmail(email); await auth.updateUser(user.uid, { displayName: name, password, disabled: false }); }
  catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; user = await auth.createUser({ email, password, displayName: name, emailVerified: true }); }
  await auth.setCustomUserClaims(user.uid, { role: "super_admin" });
  if (process.env.FIREBASE_USE_CLI_CREDENTIALS === "true") await writeWithCliCredentials(projectId, user.uid, name, username);
  else {
    const db = getFirestore();
    const batch = db.batch(); batch.set(db.doc(`users/${user.uid}`), { name, username, usernameLower: username, role: "super_admin", active: true, createdAt: FieldValue.serverTimestamp(), createdBy: "system" }, { merge: true }); batch.set(db.doc(`usernames/${username}`), { uid: user.uid, createdAt: FieldValue.serverTimestamp() }, { merge: true }); await batch.commit();
  }
  console.log(`Super Admin ${name} (@${username}) is ready. UID: ${user.uid}`);
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });

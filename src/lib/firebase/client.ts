import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const config = {
  // Firebase Web configuration is a public project identifier, not an Admin credential.
  // Keeping the production values as fallbacks prevents hosts such as Vercel from
  // silently connecting to a demo project when NEXT_PUBLIC_* variables are absent.
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB3YTmWY9gj50Qu6aq2IBAcsoWaZ8kvmX4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "salle-loay-gestion-2026.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salle-loay-gestion-2026",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "salle-loay-gestion-2026.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "372599098824",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:372599098824:web:3126537becbd0dbe3344fd",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp, process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "europe-west1");

let initialized = false;
export async function initializeFirebaseClient() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  await setPersistence(auth, browserLocalPersistence);
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  }
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (siteKey && process.env.NODE_ENV === "production") {
    initializeAppCheck(firebaseApp, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
  }
}

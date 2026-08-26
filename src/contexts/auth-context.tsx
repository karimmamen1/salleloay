"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db, initializeFirebaseClient } from "@/lib/firebase/client";
import type { AdminUser } from "@/types";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const toInternalEmail = (username: string) => `${username.trim().toLowerCase()}@auth.salle-loay.local`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void initializeFirebaseClient();
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopProfile?.();
      setFirebaseUser(user);
      if (!user) { setProfile(null); setLoading(false); return; }
      stopProfile = onSnapshot(doc(db, "users", user.uid), async (snapshot) => {
        if (!snapshot.exists() || snapshot.data().active !== true) {
          setProfile(null);
          await signOut(auth);
        } else {
          setProfile({ uid: snapshot.id, ...snapshot.data() } as AdminUser);
        }
        setLoading(false);
      }, () => setLoading(false));
    });
    return () => { stopProfile?.(); stopAuth(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    firebaseUser,
    profile,
    loading,
    login: async (username, password) => {
      const credential = await signInWithEmailAndPassword(auth, toInternalEmail(username), password);
      const snapshot = await getDoc(doc(db, "users", credential.user.uid));
      if (!snapshot.exists() || snapshot.data().active !== true) {
        await signOut(auth);
        throw new Error("account-disabled");
      }
    },
    logout: () => signOut(auth),
  }), [firebaseUser, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

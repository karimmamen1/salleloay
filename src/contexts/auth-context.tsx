"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import type { AdminUser } from "@/types";

interface AuthContextValue {
  profile: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const user = await apiRequest<AdminUser>("/api/auth/me");
        if (active) setProfile(user);
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const focus = () => { void load(); };
    window.addEventListener("focus", focus);
    return () => { active = false; window.removeEventListener("focus", focus); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    profile,
    loading,
    login: async (username, password) => {
      try {
        const user = await apiRequest<AdminUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
        setProfile(user);
      } catch (error) {
        if (error instanceof ApiRequestError) throw new Error(error.code);
        throw error;
      }
    },
    logout: async () => {
      try { await apiRequest("/api/auth/logout", { method: "POST" }); } finally { setProfile(null); }
    },
  }), [profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

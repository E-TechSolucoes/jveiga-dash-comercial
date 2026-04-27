"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { clearToken, readToken, writeToken } from "./storage";
import type { AuthUser, Dashboard, Session } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const DEV_ENABLED = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true";

type AuthResponse = {
  token: string;
  expires_at: string;
  user: AuthUser;
  dashboards: Dashboard[];
};

type MeResponse = {
  user: AuthUser;
  dashboards: Dashboard[];
};

type Ctx = {
  session: Session;
  loading: boolean;
  devEnabled: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginDev: () => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

async function fetchMe(token: string): Promise<MeResponse | null> {
  const r = await fetch(`${API}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new Error("failed to load session");
  return (await r.json()) as MeResponse;
}

async function readErrorBody(r: Response): Promise<unknown> {
  return r.json().catch(() => ({ error: r.statusText }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const hydratedRef = useRef(false);

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
    setLoading(false);
    if (typeof window !== "undefined") {
      window.google?.accounts.id.disableAutoSelect();
    }
  }, []);

  const refresh = useCallback(async () => {
    const current = readToken();
    if (!current) {
      setSession(null);
      setLoading(false);
      return;
    }
    let me: MeResponse | null;
    try {
      me = await fetchMe(current);
    } catch {
      logout();
      return;
    }
    if (!me) {
      logout();
      return;
    }
    setSession({ user: me.user, dashboards: me.dashboards });
    setLoading(false);
  }, [logout]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const r = await fetch(`${API}/api/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!r.ok) throw await readErrorBody(r);
    const data = (await r.json()) as AuthResponse;
    writeToken(data.token);
    setSession({ user: data.user, dashboards: data.dashboards });
    setLoading(false);
  }, []);

  const loginDev = useCallback(async () => {
    const r = await fetch(`${API}/api/v1/auth/dev-login`, {
      method: "POST",
    });
    if (!r.ok) throw await readErrorBody(r);
    const data = (await r.json()) as AuthResponse;
    writeToken(data.token);
    setSession({ user: data.user, dashboards: data.dashboards });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void (async () => {
      await Promise.resolve();
      await refresh();
    })();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      session,
      loading,
      devEnabled: DEV_ENABLED,
      loginWithGoogle,
      loginDev,
      logout,
      refresh,
    }),
    [session, loading, loginWithGoogle, loginDev, logout, refresh],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth fora de AuthProvider");
  return ctx;
}

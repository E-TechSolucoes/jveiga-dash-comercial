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

import {
  clearTokens,
  isAccessExpiringSoon,
  readAccessToken,
  readPermissions,
  readRefreshToken,
  readRoles,
  writeRoles,
  writeTokens,
} from "./storage";
import type { ApiError, AuthUser, Dashboard, LoginResponse, Session } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type MeResponse = {
  token: string;
  expires_at: string;
  user: AuthUser;
  dashboards: Dashboard[];
};

type RegisterResponse = {
  user: AuthUser;
  email_verify_token?: string;
};

type Ctx = {
  session: Session;
  loading: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
};

const AuthCtx = createContext<Ctx | null>(null);

async function readErrorBody(r: Response): Promise<ApiError> {
  return (await r.json().catch(() => ({ error: r.statusText }))) as ApiError;
}

async function fetchMe(token: string): Promise<MeResponse | null> {
  const r = await fetch(`${API}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw await readErrorBody(r);
  return (await r.json()) as MeResponse;
}

async function callRefresh(refreshToken: string): Promise<LoginResponse> {
  const r = await fetch(`${API}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!r.ok) throw await readErrorBody(r);
  return (await r.json()) as LoginResponse;
}

let refreshPromise: Promise<LoginResponse> | null = null;

export async function refreshTokens(): Promise<LoginResponse | null> {
  if (refreshPromise) return refreshPromise;
  const rt = readRefreshToken();
  if (!rt) return null;
  refreshPromise = callRefresh(rt)
    .then((data) => {
      writeTokens(data);
      writeRoles(data.roles, data.permissions);
      return data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const hydratedRef = useRef(false);

  const logout = useCallback(async () => {
    const token = readAccessToken();
    if (token) {
      try {
        await fetch(`${API}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore — clear local anyway
      }
    }
    clearTokens();
    setSession(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const data = await refreshTokens();
      if (!data) return null;
      setSession((prev) => ({
        user: data.user,
        dashboards: prev?.dashboards ?? [],
        roles: data.roles,
        permissions: data.permissions,
      }));
      return data.access_token;
    } catch {
      clearTokens();
      setSession(null);
      return null;
    }
  }, []);

  const hydrate = useCallback(async () => {
    let token = readAccessToken();
    if (!token) {
      setSession(null);
      setLoading(false);
      return;
    }

    if (isAccessExpiringSoon()) {
      token = (await refresh()) ?? null;
      if (!token) {
        setLoading(false);
        return;
      }
    }

    let me: MeResponse | null;
    try {
      me = await fetchMe(token);
    } catch {
      clearTokens();
      setSession(null);
      setLoading(false);
      return;
    }

    if (!me) {
      // try refresh once more
      const refreshed = await refresh();
      if (!refreshed) {
        setLoading(false);
        return;
      }
      try {
        me = await fetchMe(refreshed);
      } catch {
        clearTokens();
        setSession(null);
        setLoading(false);
        return;
      }
      if (!me) {
        clearTokens();
        setSession(null);
        setLoading(false);
        return;
      }
    }

    setSession({
      user: me.user,
      dashboards: me.dashboards,
      roles: readRoles(),
      permissions: readPermissions(),
    });
    setLoading(false);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, mfaCode?: string) => {
    const r = await fetch(`${API}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mfa_code: mfaCode }),
    });
    if (!r.ok) throw await readErrorBody(r);
    const data = (await r.json()) as LoginResponse;
    writeTokens(data);
    writeRoles(data.roles, data.permissions);

    let dashboards: Dashboard[] = [];
    try {
      const me = await fetchMe(data.access_token);
      dashboards = me?.dashboards ?? [];
    } catch {
      // dashboards optional — sessão segue válida
    }

    setSession({
      user: data.user,
      dashboards,
      roles: data.roles,
      permissions: data.permissions,
    });
    setLoading(false);
  }, []);

  const register = useCallback(
    async (email: string, name: string, password: string): Promise<RegisterResponse> => {
      const r = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      if (!r.ok) throw await readErrorBody(r);
      return (await r.json()) as RegisterResponse;
    },
    [],
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void hydrate();
  }, [hydrate]);

  const value = useMemo<Ctx>(
    () => ({ session, loading, login, register, logout, refresh }),
    [session, loading, login, register, logout, refresh],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth fora de AuthProvider");
  return ctx;
}

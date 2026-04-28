import { refreshTokens } from "./auth-provider";
import { clearTokens, isAccessExpiringSoon, readAccessToken } from "./storage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const RETRY_HEADER = "X-Auth-Retried";

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function ensureAccessToken(): Promise<string | null> {
  const current = readAccessToken();
  if (current && !isAccessExpiringSoon()) return current;
  const refreshed = await refreshTokens();
  return refreshed?.access_token ?? readAccessToken();
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  const token = await ensureAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Skip the Content-Type default for FormData uploads — the browser must
  // set it (with the multipart boundary) itself.
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let r = await fetch(`${API}${path}`, { ...init, headers });

  if (r.status === 401 && !headers.has(RETRY_HEADER)) {
    let refreshed: string | null = null;
    try {
      const data = await refreshTokens();
      refreshed = data?.access_token ?? null;
    } catch {
      refreshed = null;
    }

    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      headers.set(RETRY_HEADER, "1");
      r = await fetch(`${API}${path}`, { ...init, headers });
    }
  }

  if (r.status === 401) {
    clearTokens();
    redirectToLogin();
    throw new Error("unauthorized");
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw err;
  }
  if (r.status === 204) return null as T;
  return (await r.json()) as T;
}

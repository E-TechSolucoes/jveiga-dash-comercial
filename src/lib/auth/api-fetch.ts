import { clearToken, readToken } from "./storage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const r = await fetch(`${API}${path}`, { ...init, headers });

  if (r.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("unauthorized");
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw err;
  }
  if (r.status === 204) return null as T;
  return (await r.json()) as T;
}

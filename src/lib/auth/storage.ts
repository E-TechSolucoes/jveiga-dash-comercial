import type { Tokens } from "./types";

const ACCESS_TOKEN_KEY = "auth.access_token";
const ACCESS_EXPIRES_AT_KEY = "auth.access_expires_at";
const REFRESH_TOKEN_KEY = "auth.refresh_token";
const REFRESH_EXPIRES_AT_KEY = "auth.refresh_expires_at";
const ROLES_KEY = "auth.roles";
const PERMISSIONS_KEY = "auth.permissions";

function getItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function setItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function removeItem(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function readAccessToken(): string | null {
  return getItem(ACCESS_TOKEN_KEY);
}

export function readRefreshToken(): string | null {
  return getItem(REFRESH_TOKEN_KEY);
}

export function readAccessExpiresAt(): string | null {
  return getItem(ACCESS_EXPIRES_AT_KEY);
}

export function writeTokens(tokens: Tokens) {
  setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  setItem(ACCESS_EXPIRES_AT_KEY, tokens.access_token_expires_at);
  setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  setItem(REFRESH_EXPIRES_AT_KEY, tokens.refresh_token_expires_at);
}

export function writeRoles(roles: string[], permissions: string[]) {
  setItem(ROLES_KEY, JSON.stringify(roles));
  setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
}

export function readRoles(): string[] {
  const raw = getItem(ROLES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readPermissions(): string[] {
  const raw = getItem(PERMISSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearTokens() {
  removeItem(ACCESS_TOKEN_KEY);
  removeItem(ACCESS_EXPIRES_AT_KEY);
  removeItem(REFRESH_TOKEN_KEY);
  removeItem(REFRESH_EXPIRES_AT_KEY);
  removeItem(ROLES_KEY);
  removeItem(PERMISSIONS_KEY);
}

export function isAccessExpiringSoon(skewSeconds = 30): boolean {
  const at = readAccessExpiresAt();
  if (!at) return true;
  const expiresMs = Date.parse(at);
  if (Number.isNaN(expiresMs)) return true;
  return expiresMs - Date.now() < skewSeconds * 1000;
}

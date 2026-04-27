"use client";

import { LogOut } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/lib/auth";

function initialsFor(name: string, email: string): string {
  const source = (name?.trim() || email?.trim() || "").trim();
  if (!source) return "?";
  if (source.includes("@")) return source[0]!.toUpperCase();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const MENU_WIDTH = 260;
const GAP = 8;

export function UserMenu() {
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePos = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
      );
      const top = rect.bottom + GAP;
      setPos({ top, left });
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session) return null;

  const { user } = session;
  const initials = initialsFor(user.name, user.email);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu de ${user.name || user.email}`}
        title={user.name || user.email}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)",
          color: "#1d4ed8",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.01em",
          cursor: "pointer",
          flex: "0 0 auto",
          boxShadow:
            "0 6px 14px -4px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        }}
      >
        {initials}
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: MENU_WIDTH,
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 14,
                boxShadow:
                  "0 12px 32px -8px rgba(15, 23, 42, 0.18), 0 4px 8px -4px rgba(15, 23, 42, 0.08)",
                padding: 6,
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                    flex: "0 0 auto",
                  }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.name || "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={user.email}
                  >
                    {user.email}
                  </div>
                </div>
              </div>

              <div aria-hidden style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: "#dc2626",
                  font: "inherit",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: loggingOut ? "not-allowed" : "pointer",
                  opacity: loggingOut ? 0.6 : 1,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!loggingOut) e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <LogOut size={15} strokeWidth={1.75} />
                {loggingOut ? "Saindo..." : "Sair"}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

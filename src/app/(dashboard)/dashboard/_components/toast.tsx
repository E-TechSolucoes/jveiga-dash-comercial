"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export type ToastKind = "success" | "error";

type Props = {
  kind: ToastKind;
  message: string;
  durationMs?: number;
  onDismiss: () => void;
};

export function Toast({ kind, message, durationMs = 3000, onDismiss }: Props) {
  // Renderiza num portal no <body> pra não ser afetado por contêineres com
  // display:none, overflow:hidden ou transform (que quebram position:fixed).
  // Toast só monta após interação do usuário (client-only) — sem SSR.
  if (typeof document === "undefined") return null;

  const style = { "--toast-duration": `${durationMs}ms` } as CSSProperties;
  const node = (
    <div
      className="toast"
      data-kind={kind}
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      style={style}
    >
      <div className="toast-body">
        <span className="toast-icon" aria-hidden>
          {kind === "success" ? (
            <CheckCircle2 size={20} strokeWidth={2.25} />
          ) : (
            <AlertCircle size={20} strokeWidth={2.25} />
          )}
        </span>
        <span className="toast-message">{message}</span>
        <button type="button" className="toast-close" onClick={onDismiss} aria-label="Fechar">
          <X size={16} strokeWidth={2.25} />
        </button>
      </div>
      <div className="toast-progress" aria-hidden>
        <div className="toast-progress-bar" />
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

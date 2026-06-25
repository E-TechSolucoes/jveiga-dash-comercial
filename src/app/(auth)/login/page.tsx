"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";
import type { ApiError } from "@/lib/auth";

import { EditorialPanel } from "../_components/editorial-panel";

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "error" in err) {
    return String((err as ApiError).error) || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function LoginPage() {
  const { login, session, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [showMfa, setShowMfa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password, showMfa ? mfaCode.trim() : undefined);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const code = apiErr?.code;
      const msg = errorMessage(err, "Falha ao entrar");
      if (code === "UNAUTHORIZED" && /mfa/i.test(msg)) {
        setShowMfa(true);
        setError("Informe o código MFA para continuar.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-svh grid-cols-1 bg-[#eef3fa] text-[#0f172a] lg:grid-cols-12">
      <EditorialPanel />

      <section className="relative flex flex-col bg-white px-6 py-10 sm:px-12 lg:col-span-7 lg:px-20 lg:py-14">
        {/* faint vertical grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(18,38,170,0.035) 1px, transparent 1px)",
            backgroundSize: "120px 100%",
          }}
        />

        <header className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.32em] text-[#1226aa]">
            ACESSO &nbsp;/&nbsp; ENTRAR
          </span>
          <Link
            href="/register"
            className="group flex items-center gap-2 font-mono text-[10px] tracking-[0.32em] text-[#64748b] transition hover:text-[#1226aa]"
          >
            CRIAR CONTA
            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" aria-hidden />
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16">
          <h1 className="font-sans text-[48px] leading-[1.04] font-semibold tracking-tight text-[#0f172a] sm:text-[56px]">
            Faça seu
            <span className="block font-light text-[#1226aa]">login.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#64748b]">
            Use suas credenciais para entrar no painel. Os dados refletem em tempo real o funil, as
            metas e a performance comercial.
          </p>

          <form onSubmit={handleSubmit} className="mt-12 space-y-7">
            <FieldRow label="E-MAIL" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#e9edf4] bg-white px-4 py-3.5 text-[15px] text-[#0f172a] transition outline-none placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#eff6ff]"
                placeholder="voce@empresa.com"
              />
            </FieldRow>

            <FieldRow label="SENHA" htmlFor="password">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#e9edf4] bg-white py-3.5 pr-14 pl-4 text-[15px] text-[#0f172a] transition outline-none placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#eff6ff]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#94a3b8] transition hover:text-[#1226aa] focus:text-[#1226aa] focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
            </FieldRow>

            {showMfa && (
              <FieldRow label="CÓDIGO MFA" htmlFor="mfa">
                <input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full rounded-xl border border-[#e9edf4] bg-white px-4 py-3.5 text-[15px] tracking-[0.5em] text-[#0f172a] transition outline-none placeholder:tracking-normal placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#eff6ff]"
                  placeholder="000000"
                />
              </FieldRow>
            )}

            {error && (
              <p
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c]"
              >
                <span className="mt-0.5 font-mono text-[10px] tracking-[0.32em] text-[#be123c]/70">
                  ERRO
                </span>
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl px-6 py-4 text-left text-white transition focus:ring-4 focus:ring-[#dbeafe] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #1226aa 0%, #1d3ad6 100%)",
                boxShadow: "0 12px 24px -12px rgba(18,38,170,0.6)",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-[#1d3ad6] via-[#2563eb] to-[#3b82f6] transition-transform duration-500 group-hover:translate-x-0"
              />
              <span className="relative z-10 font-mono text-[11px] tracking-[0.36em]">
                {submitting ? "ENTRANDO…" : "ENTRAR"}
              </span>
              <ArrowRight
                className="relative z-10 h-4 w-4 transition group-hover:translate-x-1"
                aria-hidden
              />
            </button>
          </form>

          <p className="mt-10 font-mono text-[10px] tracking-[0.32em] text-[#64748b]">
            SEM ACESSO?&nbsp;&nbsp;
            <Link
              href="/register"
              className="text-[#1226aa] underline-offset-[6px] transition hover:underline"
            >
              CRIAR CONTA
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2.5 block font-mono text-[10px] tracking-[0.32em] text-[#64748b]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

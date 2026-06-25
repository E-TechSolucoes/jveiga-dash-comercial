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

function fieldErrors(err: unknown): Record<string, string[]> | null {
  if (err && typeof err === "object" && "fields" in err) {
    const f = (err as ApiError).fields;
    return f ?? null;
  }
  return null;
}

export default function RegisterPage() {
  const { register, login, session, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFields({});

    if (password !== confirm) {
      setFields({ confirm: ["As senhas não conferem"] });
      return;
    }
    if (password.length < 8) {
      setFields({ password: ["A senha precisa ter ao menos 8 caracteres"] });
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), name.trim(), password);
      try {
        await login(email.trim(), password);
        router.replace("/dashboard");
      } catch (loginErr) {
        const msg = errorMessage(loginErr, "Conta criada. Faça login para continuar.");
        router.replace(`/login?msg=${encodeURIComponent(msg)}`);
      }
    } catch (err: unknown) {
      const f = fieldErrors(err);
      if (f) setFields(f);
      setError(errorMessage(err, "Falha ao criar conta"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-svh grid-cols-1 bg-[#eef3fa] text-[#0f172a] lg:grid-cols-12">
      <EditorialPanel />

      <section className="relative flex flex-col bg-white px-6 py-10 sm:px-12 lg:col-span-7 lg:px-20 lg:py-14">
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
          <Link
            href="/"
            className="font-mono text-[10px] tracking-[0.32em] text-[#1226aa] transition hover:opacity-70"
          >
            ACESSO &nbsp;/&nbsp; CRIAR CONTA
          </Link>
          <Link
            href="/login"
            className="group flex items-center gap-2 font-mono text-[10px] tracking-[0.32em] text-[#64748b] transition hover:text-[#1226aa]"
          >
            <ArrowRight
              className="h-3 w-3 -scale-x-100 transition group-hover:-translate-x-1"
              aria-hidden
            />
            ENTRAR
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
          <h1 className="font-sans text-[48px] leading-[1.04] font-semibold tracking-tight text-[#0f172a] sm:text-[56px]">
            Crie sua
            <span className="block font-light text-[#1226aa]">conta.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#64748b]">
            Peça acesso ao painel comercial. Após a aprovação, você acompanha funil, metas e
            performance em tempo real.
          </p>

          <form onSubmit={handleSubmit} className="mt-12 space-y-7">
            <Field
              id="name"
              label="NOME"
              type="text"
              autoComplete="name"
              value={name}
              onChange={setName}
              required
              errors={fields.name}
              placeholder="Seu nome completo"
            />

            <Field
              id="email"
              label="E-MAIL"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              required
              errors={fields.email}
              placeholder="voce@empresa.com"
            />

            <Field
              id="password"
              label="SENHA"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              required
              errors={fields.password}
              placeholder="Mínimo 8 caracteres"
              hint="Use ao menos 8 caracteres."
            />

            <Field
              id="confirm"
              label="CONFIRMAR SENHA"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              required
              errors={fields.confirm}
              placeholder="Repita a senha"
            />

            {error && !Object.keys(fields).length && (
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
                {submitting ? "CRIANDO CONTA…" : "CRIAR CONTA"}
              </span>
              <ArrowRight
                className="relative z-10 h-4 w-4 transition group-hover:translate-x-1"
                aria-hidden
              />
            </button>
          </form>

          <p className="mt-10 font-mono text-[10px] tracking-[0.32em] text-[#64748b]">
            JÁ TEM CONTA?&nbsp;&nbsp;
            <Link
              href="/login"
              className="text-[#1226aa] underline-offset-[6px] transition hover:underline"
            >
              ENTRAR
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  errors?: string[];
  placeholder?: string;
  hint?: string;
};

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  required,
  errors,
  placeholder,
  hint,
}: FieldProps) {
  const hasError = errors && errors.length > 0;
  const isPassword = type === "password";
  const [reveal, setReveal] = useState(false);
  const inputType = isPassword && reveal ? "text" : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2.5 block font-mono text-[10px] tracking-[0.32em] text-[#64748b]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          aria-invalid={hasError || undefined}
          className={`w-full rounded-xl border bg-white py-3.5 pl-4 text-[15px] text-[#0f172a] transition outline-none placeholder:text-[#94a3b8] focus:ring-4 ${
            isPassword ? "pr-14" : "pr-4"
          } ${
            hasError
              ? "border-[#fecdd3] focus:border-[#fb7185] focus:ring-[#fff1f2]"
              : "border-[#e9edf4] focus:border-[#3b82f6] focus:ring-[#eff6ff]"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={reveal}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[#94a3b8] transition hover:text-[#1226aa] focus:text-[#1226aa] focus:outline-none"
          >
            {reveal ? (
              <EyeOff className="h-5 w-5" aria-hidden />
            ) : (
              <Eye className="h-5 w-5" aria-hidden />
            )}
          </button>
        )}
      </div>
      {hasError ? (
        <p className="mt-2 text-xs text-[#be123c]">{errors!.join(" · ")}</p>
      ) : hint ? (
        <p className="mt-2 text-xs text-[#64748b]">{hint}</p>
      ) : null}
    </div>
  );
}

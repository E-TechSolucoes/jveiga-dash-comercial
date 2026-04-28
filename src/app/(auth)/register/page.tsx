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
    <main className="grid min-h-svh grid-cols-1 bg-white text-slate-900 lg:grid-cols-12">
      <EditorialPanel />

      <section className="relative flex flex-col px-6 py-10 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px)",
            backgroundSize: "120px 100%",
          }}
        />

        <header className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[10px] tracking-[0.32em] text-slate-500 transition hover:text-slate-900"
          >
            ACESSO &nbsp;/&nbsp; CRIAR CONTA
          </Link>
          <Link
            href="/login"
            className="group flex items-center gap-2 font-mono text-[10px] tracking-[0.32em] text-slate-500 transition hover:text-blue-700"
          >
            <ArrowRight
              className="h-3 w-3 -scale-x-100 transition group-hover:-translate-x-1"
              aria-hidden
            />
            ENTRAR
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-14">
          <h1 className="font-sans text-[56px] leading-[1] font-semibold tracking-tight text-slate-900 sm:text-[64px]">
            Crie sua
            <span className="block font-light text-blue-700">conta.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-500">
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
                className="flex items-start gap-3 border-l-2 border-rose-500 bg-rose-50/60 py-3 pl-4 text-sm text-rose-700"
              >
                <span className="mt-0.5 font-mono text-[10px] tracking-[0.32em] text-rose-700/70">
                  ERRO
                </span>
                <span className="text-rose-700">{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group relative flex w-full items-center justify-between overflow-hidden rounded-sm bg-slate-900 px-6 py-4 text-left text-white transition focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#3b82f6] transition-transform duration-500 group-hover:translate-x-0"
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

          <p className="mt-10 font-mono text-[10px] tracking-[0.32em] text-slate-500">
            JÁ TEM CONTA?&nbsp;&nbsp;
            <Link
              href="/login"
              className="text-slate-900 underline-offset-[6px] transition hover:text-blue-700 hover:underline"
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
        className="mb-2 block font-mono text-[10px] tracking-[0.32em] text-slate-500"
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
          className={`w-full rounded-md border py-3 pl-4 text-base text-slate-900 transition outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 ${
            isPassword ? "pr-14" : "pr-4"
          } ${
            hasError
              ? "border-rose-300 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/25"
              : "border-blue-200 bg-blue-50/40 focus:border-blue-600 focus:ring-blue-600/25"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={reveal}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-blue-700 focus:text-blue-700 focus:outline-none"
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
        <p className="mt-2 text-xs text-rose-600">{errors!.join(" · ")}</p>
      ) : hint ? (
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

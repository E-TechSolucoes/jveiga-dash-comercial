"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";
import type { ApiError } from "@/lib/auth";

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
        // conta criada, mas login automático falhou — manda pro login
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
    <main className="flex min-h-svh items-center justify-center bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Criar minha conta
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Preencha seus dados para acessar o painel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            id="name"
            label="Nome"
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
            label="Email"
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
            label="Senha"
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
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            required
            errors={fields.confirm}
            placeholder="Repita a senha"
          />

          {error && !Object.keys(fields).length && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {submitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-gray-900 underline-offset-2 hover:underline dark:text-gray-100"
          >
            Entrar
          </Link>
        </p>
      </div>
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
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        className={`w-full rounded-lg border px-3 py-2 text-sm transition outline-none focus:ring-2 ${
          hasError
            ? "border-red-400 bg-white text-gray-900 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60 dark:bg-gray-950 dark:text-gray-100"
            : "border-gray-300 bg-white text-gray-900 focus:border-gray-900 focus:ring-gray-900/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-100 dark:focus:ring-gray-100/10"
        }`}
      />
      {hasError ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors!.join(" · ")}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

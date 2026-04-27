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

export default function LoginPage() {
  const { login, session, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="flex min-h-svh items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            JVeiga Dash Comercial
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Entre com seu email e senha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-100 dark:focus:ring-gray-100/10"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-100 dark:focus:ring-gray-100/10"
              placeholder="••••••••"
            />
          </div>

          {showMfa && (
            <div>
              <label
                htmlFor="mfa"
                className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Código MFA
              </label>
              <input
                id="mfa"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm tracking-widest text-gray-900 transition outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                placeholder="123456"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Não tem conta?{" "}
          <Link
            href="/register"
            className="font-medium text-gray-900 underline-offset-2 hover:underline dark:text-gray-100"
          >
            Criar minha conta
          </Link>
        </p>
      </div>
    </main>
  );
}

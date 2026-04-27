"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const { loginWithGoogle, loginDev, devEnabled, session, loading } = useAuth();
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  const handleDevLogin = async () => {
    setDevLoading(true);
    setAuthError(null);
    try {
      await loginDev();
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err && "error" in err
          ? String((err as { error: unknown }).error)
          : "Falha no login de desenvolvimento";
      setAuthError(message);
    } finally {
      setDevLoading(false);
    }
  };

  const configError = !CLIENT_ID
    ? "NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado no .env.local"
    : null;
  const error = authError ?? configError;

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    const tryInit = () => {
      if (cancelled || initializedRef.current) return;
      if (!window.google || !buttonRef.current) {
        window.setTimeout(tryInit, 100);
        return;
      }
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp) => {
          try {
            await loginWithGoogle(resp.credential);
            router.replace("/dashboard");
          } catch (err: unknown) {
            const message =
              typeof err === "object" && err && "error" in err
                ? String((err as { error: unknown }).error)
                : "Falha ao autenticar com o Google";
            setAuthError(message);
          }
        },
        ux_mode: "popup",
        auto_select: false,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: "signin_with",
      });
    };

    tryInit();

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, router]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            JVeiga Dash Comercial
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Entre com sua conta Google para continuar
          </p>
        </div>

        <div ref={buttonRef} className="flex justify-center" />

        {error && (
          <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {devEnabled && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              ou
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            </div>

            <button
              type="button"
              onClick={handleDevLogin}
              disabled={devLoading}
              className="flex w-full items-center justify-center rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              {devLoading ? "Entrando..." : "Entrar como Dev (bypass)"}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
              Bypass do backend — apenas em dev/staging
            </p>
          </>
        )}
      </div>
    </main>
  );
}

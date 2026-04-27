"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./auth-provider";

type Props = {
  children: React.ReactNode;
  admin?: boolean;
};

export function RequireAuth({ children, admin = false }: Props) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (admin && !session.user.is_admin) {
      router.replace("/forbidden");
    }
  }, [session, loading, admin, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-gray-500">
        Carregando...
      </div>
    );
  }

  if (admin && !session.user.is_admin) {
    return null;
  }

  return <>{children}</>;
}

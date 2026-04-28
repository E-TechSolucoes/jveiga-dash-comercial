"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "./auth-provider";
import { readAccessToken } from "./storage";

type Props = {
  children: React.ReactNode;
  admin?: boolean;
};

export function RequireAuth({ children, admin = false }: Props) {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Optimistic gate: if a token exists in storage, render children right away
  // so the page can show its own skeletons while the session hydrates.
  const [hasStoredToken] = useState(() => Boolean(readAccessToken()));

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

  if (loading && !hasStoredToken) return null;
  if (!loading && !session) return null;
  if (admin && session && !session.user.is_admin) return null;

  return <>{children}</>;
}

import { RequireAuth } from "@/lib/auth";

import { AdminShell } from "./_components/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth admin>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}

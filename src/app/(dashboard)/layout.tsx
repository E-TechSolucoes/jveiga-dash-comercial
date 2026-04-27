import { RequireAuth } from "@/lib/auth";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

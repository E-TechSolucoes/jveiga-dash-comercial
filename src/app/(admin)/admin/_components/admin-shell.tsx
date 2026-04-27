"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Settings, type LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  description: string;
};

const NAV: NavItem[] = [
  {
    href: "/admin/stand-check",
    label: "Base do Estande",
    Icon: ClipboardCheck,
    description: "Itens da aba Check — checklist de estande",
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand">
            <div className="admin-brand-avatar" aria-hidden>
              JV
            </div>
            <div>
              <div className="admin-brand-title">Painel Administrativo</div>
              <div className="admin-brand-sub">Configurações &middot; Jerônimo da Veiga</div>
            </div>
          </div>

          <Link href="/dashboard" className="admin-back">
            <ArrowLeft size={14} strokeWidth={2} />
            Voltar ao painel
          </Link>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-side">
          <div className="admin-side-head">
            <div className="admin-side-ico" aria-hidden>
              <Settings size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div className="admin-side-title">Configurações</div>
              <div className="admin-side-sub">Painel administrativo</div>
            </div>
          </div>

          <nav className="admin-nav" aria-label="Configurações">
            <div className="admin-nav-group-label">Check</div>
            {NAV.map((item) => {
              const Icon = item.Icon;
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="admin-nav-item"
                  data-active={active ? "true" : "false"}
                >
                  <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                  <span className="admin-nav-item-text">
                    <span className="admin-nav-item-label">{item.label}</span>
                    <span className="admin-nav-item-desc">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="admin-main">
          <div className="admin-main-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

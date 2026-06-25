"use client";

import {
  BookOpen,
  Building2,
  CheckCircle2,
  Gift,
  FolderOpen,
  LayoutDashboard,
  Search,
  Swords,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { TabId } from "./types";

type TabAccent = "blue" | "emerald" | "violet" | "amber" | "rose" | "sky" | "teal" | "pink";

export type TabItem = {
  id: TabId;
  label: string;
  href: string;
  icon: LucideIcon;
  accent: TabAccent;
};

export const TAB_ITEMS: TabItem[] = [
  { id: "resumo", label: "Resumo", href: "/dashboard", icon: LayoutDashboard, accent: "blue" },
  {
    id: "checklist",
    label: "A Fazer",
    href: "/dashboard/checklist",
    icon: CheckCircle2,
    accent: "emerald",
  },
  { id: "recep", label: "Recepção", href: "/dashboard/recep", icon: Gift, accent: "violet" },
  {
    id: "auditoria",
    label: "Auditoria",
    href: "/dashboard/auditoria",
    icon: Search,
    accent: "sky",
  },
  { id: "pastas", label: "Pastas", href: "/dashboard/pastas", icon: FolderOpen, accent: "amber" },
  {
    id: "acoes-semana",
    label: "Ações da Semana",
    href: "/dashboard/acoes-semana",
    icon: Target,
    accent: "blue",
  },
  {
    id: "acoes-offline",
    label: "Ações Offline",
    href: "/dashboard/acoes-offline",
    icon: Swords,
    accent: "rose",
  },
  { id: "imob", label: "Imobiliárias", href: "/dashboard/imob", icon: Building2, accent: "teal" },
  {
    id: "conhecimento",
    label: "Conhecimento",
    href: "/dashboard/conhecimento",
    icon: BookOpen,
    accent: "pink",
  },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabsNav() {
  const pathname = usePathname();

  return (
    <div className="tabs" role="tablist" aria-label="Seções do painel">
      {TAB_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className="tab"
            data-accent={tab.accent}
          >
            <Icon size={16} strokeWidth={isActive ? 2.25 : 1.75} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

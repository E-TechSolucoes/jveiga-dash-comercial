"use client";

import {
  BookOpen,
  Building2,
  CheckCircle2,
  Gift,
  FolderOpen,
  LayoutDashboard,
  Radio,
  Swords,
  type LucideIcon,
} from "lucide-react";

import type { TabId } from "./types";

type TabAccent = "blue" | "emerald" | "violet" | "amber" | "rose" | "sky" | "teal" | "pink";

export type TabItem = {
  id: TabId;
  label: string;
  icon: LucideIcon;
  accent: TabAccent;
};

export const TAB_ITEMS: TabItem[] = [
  { id: "resumo", label: "Resumo", icon: LayoutDashboard, accent: "blue" },
  { id: "checklist", label: "A Fazer", icon: CheckCircle2, accent: "emerald" },
  { id: "recep", label: "Recepção", icon: Gift, accent: "violet" },
  { id: "pastas", label: "Pastas", icon: FolderOpen, accent: "amber" },
  { id: "arsenal", label: "Armas", icon: Swords, accent: "rose" },
  { id: "outbound", label: "Outbound", icon: Radio, accent: "sky" },
  { id: "imob", label: "Imobiliárias", icon: Building2, accent: "teal" },
  { id: "conhecimento", label: "Conhecimento", icon: BookOpen, accent: "pink" },
];

type Props = {
  active: TabId;
  onSelect: (id: TabId) => void;
};

export function TabsNav({ active, onSelect }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="Seções do painel">
      {TAB_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className="tab"
            data-accent={tab.accent}
            onClick={() => onSelect(tab.id)}
          >
            <Icon size={16} strokeWidth={isActive ? 2.25 : 1.75} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

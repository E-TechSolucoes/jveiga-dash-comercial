"use client";

import { CalendarDays, ClipboardList, Swords } from "lucide-react";
import { useState } from "react";

import { ArsenalTab } from "../../arsenal/_components/arsenal-tab";
import { OutboundTab } from "../../outbound/_components/outbound-tab";

type Props = {
  semana: number;
  onSemanaChange: (next: number) => void;
  empreendimentoIds: number[];
  initialSub?: SubTabId;
};

export type SubTabId = "cadastro" | "resultado";

const SUB_TABS: {
  id: SubTabId;
  label: string;
  Icon: typeof Swords;
  variant: "rose" | "emerald";
}[] = [
  { id: "cadastro", label: "Cadastro de Ações Offline", Icon: Swords, variant: "rose" },
  {
    id: "resultado",
    label: "Resultado das Ações Offline",
    Icon: ClipboardList,
    variant: "emerald",
  },
];

export function AcoesOfflineTab({
  semana,
  onSemanaChange,
  empreendimentoIds,
  initialSub = "cadastro",
}: Props) {
  const [sub, setSub] = useState<SubTabId>(initialSub);

  return (
    <div className="acoes-semana-tab">
      <header className="tab-hero acoes-hero">
        <div className="acoes-hero-text">
          <span className="tab-hero-eyebrow">Gestão Comercial</span>
          <h1 className="tab-hero-title">
            Ações <em>Offline</em>
          </h1>
          <p className="tab-hero-subtitle">
            Cadastro de ações de campo e acompanhamento de leads, visitas e vendas
          </p>
        </div>
        <div className="acoes-hero-aside">
          <span className="acoes-status-badge" data-tone="edit">
            <CalendarDays size={12} strokeWidth={2.5} aria-hidden />
            Semana comercial Ter → Seg
          </span>
        </div>
      </header>

      <div role="tablist" aria-label="Seções de ações offline" className="seg">
        {SUB_TABS.map((tab) => {
          const Icon = tab.Icon;
          const active = sub === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-pressed={active}
              aria-selected={active}
              className={`seg-btn${active ? ` seg-btn--${tab.variant}` : ""}`}
              onClick={() => setSub(tab.id)}
            >
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="acoes-semana-panel" role="tabpanel">
        {sub === "cadastro" ? (
          <ArsenalTab
            semana={semana}
            onSemanaChange={onSemanaChange}
            empreendimentoIds={empreendimentoIds}
          />
        ) : (
          <OutboundTab
            semana={semana}
            onSemanaChange={onSemanaChange}
            empreendimentoIds={empreendimentoIds}
          />
        )}
      </div>
    </div>
  );
}

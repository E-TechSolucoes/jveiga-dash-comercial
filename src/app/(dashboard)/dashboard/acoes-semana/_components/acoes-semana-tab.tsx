"use client";

import { CalendarDays, ClipboardList, Target } from "lucide-react";
import { useState } from "react";

import { AcoesTab } from "./acoes-tab";
import { AcoesResultadosSection } from "./acoes-resultados-section";

type Props = {
  empreendimentoIds: number[];
  empresaLabel: string;
  empresaNomeById?: Record<number, string>;
  semNome: boolean;
};

type SubTabId = "planejamento" | "resultado";

const SUB_TABS: {
  id: SubTabId;
  label: string;
  Icon: typeof Target;
  variant: "blue" | "emerald";
}[] = [
  { id: "planejamento", label: "Ações da Semana", Icon: Target, variant: "blue" },
  { id: "resultado", label: "Resultado das Ações", Icon: ClipboardList, variant: "emerald" },
];

export function AcoesSemanaTab({
  empreendimentoIds,
  empresaLabel,
  empresaNomeById = {},
  semNome,
}: Props) {
  const [sub, setSub] = useState<SubTabId>("planejamento");

  return (
    <div className="acoes-semana-tab">
      <header className="tab-hero acoes-hero">
        <div className="acoes-hero-text">
          <span className="tab-hero-eyebrow">Gestão Comercial</span>
          <h1 className="tab-hero-title">
            Ações da <em>Semana</em>
          </h1>
          <p className="tab-hero-subtitle">
            {empresaLabel
              ? `${empresaLabel} · planejamento e acompanhamento semanal`
              : "Planejamento e acompanhamento das ações comerciais"}
          </p>
        </div>
        <div className="acoes-hero-aside">
          <span className="acoes-status-badge" data-tone="edit">
            <CalendarDays size={12} strokeWidth={2.5} aria-hidden />
            Semana comercial Ter → Seg
          </span>
        </div>
      </header>

      <div role="tablist" aria-label="Seções de ações da semana" className="seg">
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
        {sub === "planejamento" ? (
          <AcoesTab
            embedded
            empresa={String(empreendimentoIds[0] ?? "")}
            empresaLabel={empresaLabel}
            semNome={semNome}
          />
        ) : (
          <AcoesResultadosSection
            embedded
            empreendimentoIds={empreendimentoIds}
            empresaLabel={empresaLabel}
            empresaNomeById={empresaNomeById}
            semNome={semNome}
          />
        )}
      </div>
    </div>
  );
}

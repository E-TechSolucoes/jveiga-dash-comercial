"use client";

import { CalendarDays, ClipboardList, Target } from "lucide-react";
import { useState } from "react";

import { ArsenalTab } from "../../arsenal/_components/arsenal-tab";
import { OutboundTab } from "../../outbound/_components/outbound-tab";
import { AcoesResultadosSection } from "../../acoes-semana/_components/acoes-resultados-section";

type Props = {
  empresa: string;
  empresaLabel: string;
  semNome: boolean;
  semana: number;
  onSemanaChange: (next: number) => void;
  empreendimentoIds: number[];
  initialSub?: SubTabId;
};

export type SubTabId = "planejamento" | "resultado";

const SUB_TABS: {
  id: SubTabId;
  label: string;
  Icon: typeof Target;
  variant: "blue" | "emerald";
}[] = [
  { id: "planejamento", label: "Ações da Semana", Icon: Target, variant: "blue" },
  { id: "resultado", label: "Resultado das Ações", Icon: ClipboardList, variant: "emerald" },
];

export function GestaoAcoesTab({
  empresa,
  empresaLabel,
  semNome,
  semana,
  onSemanaChange,
  empreendimentoIds,
  initialSub = "planejamento",
}: Props) {
  const [sub, setSub] = useState<SubTabId>(initialSub);

  return (
    <div className="acoes-semana-tab">
      <header className="tab-hero acoes-hero">
        <div className="acoes-hero-text">
          <span className="tab-hero-eyebrow">Gestão Comercial</span>
          <h1 className="tab-hero-title">
            Gestão de <em>Ações</em>
          </h1>
          <p className="tab-hero-subtitle">
            {empresaLabel
              ? `${empresaLabel} · planejamento, campo e acompanhamento semanal`
              : "Planejamento, cadastro de campo e acompanhamento das ações comerciais"}
          </p>
        </div>
        <div className="acoes-hero-aside">
          <span className="acoes-status-badge" data-tone="edit">
            <CalendarDays size={12} strokeWidth={2.5} aria-hidden />
            Semana comercial Ter → Seg
          </span>
        </div>
      </header>

      <div role="tablist" aria-label="Seções de gestão de ações" className="seg">
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
          <ArsenalTab
            semana={semana}
            onSemanaChange={onSemanaChange}
            empreendimentoIds={empreendimentoIds}
          />
        ) : (
          <div className="gestao-acoes-resultado">
            <AcoesResultadosSection
              embedded
              empresa={empresa}
              empresaLabel={empresaLabel}
              semNome={semNome}
            />
            <section className="gestao-acoes-outbound" aria-label="Leads e ROI das ações">
              <div className="gestao-acoes-outbound-head">
                <h2 className="gestao-acoes-outbound-title">Leads e ROI</h2>
                <p className="gestao-acoes-outbound-sub">
                  Importação, cadastro manual e retorno das ações de campo
                </p>
              </div>
              <OutboundTab
                semana={semana}
                onSemanaChange={onSemanaChange}
                empreendimentoIds={empreendimentoIds}
              />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

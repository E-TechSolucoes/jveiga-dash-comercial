"use client";

import { useMemo } from "react";

import { useDashboardData } from "../../_components/dashboard-provider";
import { GestaoAcoesTab, type SubTabId } from "./gestao-acoes-tab";

type Props = {
  initialSub: SubTabId;
};

export function GestaoAcoesShell({ initialSub }: Props) {
  const { semana, setSemana, empreendimentoIds, empresasCodigos, empresasNomes, empresasKey } =
    useDashboardData();

  const empresa = empresasCodigos[0] ?? "";
  const empresaLabel = useMemo(() => {
    if (empresasCodigos.length === 0) return "";
    const codigo = empresasCodigos[0];
    const nome = empresasNomes[0] ?? "";
    return codigo && nome ? `${codigo} - ${nome}` : nome || codigo;
  }, [empresasCodigos, empresasNomes]);
  const semNome = empresasCodigos.length === 0;

  return (
    <div className="tc" data-active="true">
      <GestaoAcoesTab
        key={`${empresasKey}-${initialSub}`}
        initialSub={initialSub}
        empresa={empresa}
        empresaLabel={empresaLabel}
        semNome={semNome}
        semana={semana}
        onSemanaChange={setSemana}
        empreendimentoIds={empreendimentoIds}
      />
    </div>
  );
}

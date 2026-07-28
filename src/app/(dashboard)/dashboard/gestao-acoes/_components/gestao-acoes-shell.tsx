"use client";

import { useMemo } from "react";

import { useDashboardData } from "../../_components/dashboard-provider";
import { GestaoAcoesTab, type SubTabId } from "./gestao-acoes-tab";

type Props = {
  initialSub: SubTabId;
};

function formatEmpresasLabel(codigos: string[], nomes: string[]): string {
  if (codigos.length === 0) return "";
  return codigos
    .map((codigo, i) => {
      const nome = nomes[i] ?? "";
      return codigo && nome ? `${codigo} - ${nome}` : nome || codigo;
    })
    .filter(Boolean)
    .join(" · ");
}

export function GestaoAcoesShell({ initialSub }: Props) {
  const { semana, setSemana, empreendimentoIds, empresasCodigos, empresasNomes, empresasKey } =
    useDashboardData();

  const empresaLabel = useMemo(
    () => formatEmpresasLabel(empresasCodigos, empresasNomes),
    [empresasCodigos, empresasNomes],
  );
  const empresaNomeById = useMemo(() => {
    const map: Record<number, string> = {};
    for (let i = 0; i < empresasCodigos.length; i++) {
      const id = Number.parseInt(empresasCodigos[i] ?? "", 10);
      if (!Number.isFinite(id) || id <= 0) continue;
      map[id] = empresasNomes[i] ?? "";
    }
    return map;
  }, [empresasCodigos, empresasNomes]);
  const semNome = empresasCodigos.length === 0;

  return (
    <div className="tc" data-active="true">
      <GestaoAcoesTab
        key={`${empresasKey}-${initialSub}`}
        initialSub={initialSub}
        empresaLabel={empresaLabel}
        empresaNomeById={empresaNomeById}
        semNome={semNome}
        semana={semana}
        onSemanaChange={setSemana}
        empreendimentoIds={empreendimentoIds}
      />
    </div>
  );
}

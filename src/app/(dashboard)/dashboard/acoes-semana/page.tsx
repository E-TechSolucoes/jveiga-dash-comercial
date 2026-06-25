"use client";

import { useMemo } from "react";

import { useDashboardData } from "../_components/dashboard-provider";
import { AcoesSemanaTab } from "./_components/acoes-semana-tab";

export default function AcoesSemanaPage() {
  const { empresasCodigos, empresasNomes, empresasKey } = useDashboardData();

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
      <AcoesSemanaTab
        key={empresasKey}
        empresa={empresa}
        empresaLabel={empresaLabel}
        semNome={semNome}
      />
    </div>
  );
}

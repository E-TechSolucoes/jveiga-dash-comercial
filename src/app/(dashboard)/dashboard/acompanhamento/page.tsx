"use client";

import { useMemo } from "react";

import { useDashboardData } from "../_components/dashboard-provider";
import { AcompanhamentoTab, type AcompanhamentoEnterprise } from "./_components/acompanhamento-tab";

export default function AcompanhamentoPage() {
  const { empresasCodigos, empresasNomes, empresasKey } = useDashboardData();

  const enterprises = useMemo<AcompanhamentoEnterprise[]>(() => {
    const n = Math.min(empresasCodigos.length, empresasNomes.length || empresasCodigos.length);
    const out: AcompanhamentoEnterprise[] = [];
    for (let i = 0; i < empresasCodigos.length; i++) {
      const code = empresasCodigos[i];
      if (!code) continue;
      // nomes podem ficar desalinhados se algum código não tiver label —
      // preferimos o nome no mesmo índice; senão só o código.
      const name = empresasNomes[i] ?? empresasNomes[Math.min(i, n - 1)] ?? "";
      out.push({ code, name });
    }
    return out;
  }, [empresasCodigos, empresasNomes]);

  const semNome = enterprises.length === 0;

  return (
    <div className="tc" data-active="true">
      <AcompanhamentoTab key={empresasKey} enterprises={enterprises} semNome={semNome} />
    </div>
  );
}

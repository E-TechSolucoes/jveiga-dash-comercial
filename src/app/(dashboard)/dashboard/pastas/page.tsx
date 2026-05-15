"use client";

import { useDashboardData } from "../_components/dashboard-provider";
import { PastasTab } from "./_components/pastas-tab";

export default function PastasPage() {
  const {
    empresasKey,
    empresasNomes,
    empresasCodigos,
    periodBounds,
    pastasLoading,
    pastasError,
    pastasKpis,
  } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <PastasTab
        key={empresasKey}
        semNome={empresasNomes.length === 0}
        empresasNomes={empresasNomes}
        empresasCodigos={empresasCodigos}
        periodBounds={periodBounds}
        loading={pastasLoading}
        error={pastasError}
        kpis={pastasKpis}
      />
    </div>
  );
}

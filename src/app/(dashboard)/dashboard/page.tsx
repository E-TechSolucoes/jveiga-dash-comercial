"use client";

import { CascadeCard } from "./_components/cascade-card";
import { useDashboardData } from "./_components/dashboard-provider";
import { PpcConsolidadoHero } from "./_components/ppc-consolidado-hero";
import { RankingSkinsSection } from "./_components/ranking-skins-section";
import { RegrasOuroCard } from "./_components/regras-ouro-card";

export default function ResumoPage() {
  const {
    semana,
    meta,
    taxas,
    real,
    goalsBreakdown,
    empreendimentoIds,
    funnelLoading,
    pastasLoading,
    salesPlanLoading,
    taxasLoading,
  } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <PpcConsolidadoHero
        meta={meta}
        taxas={taxas}
        real={real}
        empreendimentoIds={empreendimentoIds}
        funnelLoading={funnelLoading}
        pastasLoading={pastasLoading}
        salesPlanLoading={salesPlanLoading}
        taxasLoading={taxasLoading}
      />
      <CascadeCard
        semana={semana}
        meta={meta}
        taxas={taxas}
        real={real}
        goalsBreakdown={goalsBreakdown}
      />
      <RankingSkinsSection semana={semana} empreendimentoIds={empreendimentoIds} />
      <RegrasOuroCard />
    </div>
  );
}

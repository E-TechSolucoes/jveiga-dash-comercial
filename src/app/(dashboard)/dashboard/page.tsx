"use client";

import { CascadeCard } from "./_components/cascade-card";
import { useDashboardData } from "./_components/dashboard-provider";
import { FunnelSection } from "./_components/funnel-section";
import { RankingSkinsSection } from "./_components/ranking-skins-section";
import { RegrasOuroCard } from "./_components/regras-ouro-card";

export default function ResumoPage() {
  const {
    semana,
    meta,
    taxas,
    real,
    performance,
    goalsBreakdown,
    funnelLoading,
    empreendimentoIds,
  } = useDashboardData();

  return (
    <div className="tc" data-active="true">
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

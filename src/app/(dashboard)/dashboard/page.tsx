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
    handleMetaChange,
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
        onMetaChange={handleMetaChange}
        taxas={taxas}
        real={real}
        goalsBreakdown={goalsBreakdown}
      />
      <FunnelSection
        real={real}
        metaVendas={meta}
        performance={performance}
        loading={funnelLoading}
      />
      <RankingSkinsSection semana={semana} empreendimentoIds={empreendimentoIds} />
      <RegrasOuroCard />
    </div>
  );
}

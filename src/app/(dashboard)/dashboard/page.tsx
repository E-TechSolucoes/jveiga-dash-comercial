"use client";

import { useMemo } from "react";

import { useFunil, usePastasKpis } from "@/hooks/use-dashboard";
import {
  currentReuniaoTuesdayIso,
  getReuniaoWeekBounds,
  reuniaoWeekRangeLabel,
} from "@/lib/dashboard/reuniao-week";

import { CascadeCard } from "./_components/cascade-card";
import { useDashboardData } from "./_components/dashboard-provider";
import { PpcConsolidadoHero } from "./_components/ppc-consolidado-hero";
import { RankingSkinsSection } from "./_components/ranking-skins-section";
import { RegrasOuroCard } from "./_components/regras-ouro-card";
import { weeklyVendasMeta } from "./_components/resumo-ppc";
import type { FunnelNumbers } from "./_components/types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function ResumoPage() {
  const {
    taxas,
    goalsBreakdown,
    empreendimentoIds,
    empresasCodigos,
    empresasNomes,
    salesPlanLoading,
    taxasLoading,
  } = useDashboardData();

  // Alinhado ao dash vendas: funil do PPC = semana de reunião completa (Ter→Seg).
  // Dias futuros ainda sem dado no BQ retornam zero.
  const reuniaoTuesday = useMemo(() => currentReuniaoTuesdayIso(), []);
  const reuniaoBounds = useMemo(() => getReuniaoWeekBounds(reuniaoTuesday), [reuniaoTuesday]);
  const reuniaoPeriod = useMemo(
    () => ({ from: reuniaoBounds.from, to: reuniaoBounds.to }),
    [reuniaoBounds.from, reuniaoBounds.to],
  );
  const weekRangeLabel = useMemo(() => reuniaoWeekRangeLabel(reuniaoTuesday), [reuniaoTuesday]);

  const funilQuery = useFunil(empresasCodigos, empresasNomes, reuniaoPeriod);
  const pastasQuery = usePastasKpis(empresasNomes, empresasCodigos, reuniaoPeriod);

  const funil = funilQuery.data;
  const pastasKpis = pastasQuery.data ?? null;

  const real = useMemo<FunnelNumbers>(
    () => ({
      leads: funil?.leads ?? 0,
      visitas: funil?.visitas ?? 0,
      pastas: pastasKpis?.total ?? 0,
      vendas: funil?.vendas ?? 0,
      vendasAcumuladoHistorico: funil?.vendasAcumuladoHistorico ?? 0,
    }),
    [funil, pastasKpis],
  );

  // Meta de vendas da janela: rateio diário do plano mensal dos empreendimentos
  // selecionados (mesmo critério do Resumo do dash vendas).
  const monthlyMeta = useMemo(
    () => goalsBreakdown.reduce((sum, g) => sum + g.value, 0),
    [goalsBreakdown],
  );
  const plansByYm = useMemo(() => {
    const map = new Map<string, number>();
    const start = reuniaoBounds.from;
    const y = Number(start.slice(0, 4));
    const m = Number(start.slice(5, 7));
    if (Number.isFinite(y) && Number.isFinite(m) && monthlyMeta > 0) {
      map.set(`${y}-${pad2(m)}`, monthlyMeta);
    }
    return map;
  }, [monthlyMeta, reuniaoBounds.from]);

  const weekMeta = useMemo(
    () => Math.round(weeklyVendasMeta(reuniaoBounds.from, reuniaoBounds.to, plansByYm)),
    [reuniaoBounds.from, reuniaoBounds.to, plansByYm],
  );

  // Breakdown proporcional à meta semanal (tooltip da cascata).
  const weekGoalsBreakdown = useMemo(() => {
    if (!(monthlyMeta > 0) || weekMeta <= 0) return goalsBreakdown;
    const factor = weekMeta / monthlyMeta;
    return goalsBreakdown.map((g) => ({
      ...g,
      value: Math.round(g.value * factor),
    }));
  }, [goalsBreakdown, monthlyMeta, weekMeta]);

  return (
    <div className="tc" data-active="true">
      <PpcConsolidadoHero
        meta={weekMeta}
        taxas={taxas}
        real={real}
        empreendimentoIds={empreendimentoIds}
        funnelLoading={funilQuery.isFetching}
        pastasLoading={pastasQuery.isFetching}
        salesPlanLoading={salesPlanLoading}
        taxasLoading={taxasLoading}
        weekLabel={weekRangeLabel}
      />
      <CascadeCard
        weekLabel={weekRangeLabel}
        meta={weekMeta}
        taxas={taxas}
        real={real}
        goalsBreakdown={weekGoalsBreakdown}
      />
      {/* semana=1 → segunda da semana corrente (weekStartFromSemana). */}
      <RankingSkinsSection semana={1} empreendimentoIds={empreendimentoIds} />
      <RegrasOuroCard />
    </div>
  );
}

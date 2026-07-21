"use client";

import { useEffect, useMemo, useState } from "react";

import { useResourceVersion } from "@/lib/dashboard/data-bus";
import {
  previousReuniaoTuesdayIso,
  weeklyActionsWeekStartFromReuniao,
} from "@/lib/dashboard/reuniao-week";
import { listWeeklyActions, type WeeklyActionDTO } from "@/lib/weekly-actions/api";

import { computeCascadeRemaining, type FunnelNumbers, type Taxas } from "./types";

type Props = {
  meta: number;
  taxas: Taxas;
  real: FunnelNumbers;
  empreendimentoIds: number[];
  funnelLoading: boolean;
  pastasLoading: boolean;
  salesPlanLoading: boolean;
  taxasLoading: boolean;
};

function calcPPC(real: number, meta: number): number | null {
  if (!Number.isFinite(meta) || meta <= 0) return null;
  return Math.round((real / meta) * 100);
}

function ppcHeroTone(ppc: number | null): "ok" | "warn" | "alert" {
  if (ppc === null) return "alert";
  if (ppc > 85) return "ok";
  if (ppc >= 70) return "warn";
  return "alert";
}

function parseAchieved(a: WeeklyActionDTO): { meta: number | null; real: number | null } {
  const metaRaw = a.objective ? Number(a.objective) : NaN;
  const meta = Number.isFinite(metaRaw) && metaRaw > 0 ? metaRaw : null;
  const real = a.achieved == null ? null : Number(a.achieved);
  return { meta, real: Number.isFinite(real as number) ? (real as number) : null };
}

function calcAcoesPPC(actions: WeeklyActionDTO[]): number | null {
  let acoesMeta = 0;
  let acoesReal = 0;
  for (const a of actions) {
    const { meta, real } = parseAchieved(a);
    if (meta !== null) acoesMeta += meta;
    if (real !== null) acoesReal += real;
  }
  return calcPPC(acoesReal, acoesMeta);
}

function avgFunilPpc(real: FunnelNumbers, meta: number, taxas: Taxas): number | null {
  if (!(meta > 0)) return null;
  const cascade = computeCascadeRemaining({
    meta,
    taxas,
    vendasRealizadas: real.vendas,
    real: { leads: real.leads, visitas: real.visitas, pastas: real.pastas },
  });
  const stages = [
    calcPPC(real.leads, cascade.leads),
    calcPPC(real.visitas, cascade.visitas),
    calcPPC(real.pastas, cascade.pastas),
    calcPPC(real.vendas, meta),
  ].filter((p): p is number => p !== null);
  if (stages.length === 0) return null;
  return Math.round(stages.reduce((a, b) => a + b, 0) / stages.length);
}

export function PpcConsolidadoHero({
  meta,
  taxas,
  real,
  empreendimentoIds,
  funnelLoading,
  pastasLoading,
  salesPlanLoading,
  taxasLoading,
}: Props) {
  const weeklyActionsVersion = useResourceVersion("weekly-actions");
  const [acoesPPC, setAcoesPPC] = useState<number | null>(null);
  const [acoesLoading, setAcoesLoading] = useState(true);

  const idsKey = empreendimentoIds.join(",");

  useEffect(() => {
    if (empreendimentoIds.length === 0) {
      queueMicrotask(() => {
        setAcoesPPC(null);
        setAcoesLoading(false);
      });
      return;
    }
    const ac = new AbortController();
    queueMicrotask(() => {
      if (!ac.signal.aborted) setAcoesLoading(true);
    });
    const weekStart = weeklyActionsWeekStartFromReuniao(previousReuniaoTuesdayIso());
    Promise.all(
      empreendimentoIds.map((id) =>
        listWeeklyActions({ empreendimentoId: id, weekStart }, ac.signal).catch(
          () => [] as WeeklyActionDTO[],
        ),
      ),
    )
      .then((rows) => {
        if (ac.signal.aborted) return;
        setAcoesPPC(calcAcoesPPC(rows.flat()));
      })
      .catch(() => {
        if (!ac.signal.aborted) setAcoesPPC(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setAcoesLoading(false);
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, weeklyActionsVersion]);

  const inputsReady =
    !acoesLoading && !funnelLoading && !pastasLoading && !salesPlanLoading && !taxasLoading;

  const vendasPPC = useMemo(
    () => (inputsReady ? calcPPC(real.vendas, meta) : null),
    [inputsReady, real.vendas, meta],
  );
  const funilPPC = useMemo(
    () => (inputsReady ? avgFunilPpc(real, meta, taxas) : null),
    [inputsReady, real, meta, taxas],
  );
  const acoesReadyPPC = inputsReady ? acoesPPC : null;

  const consolidatedPPC = useMemo(() => {
    if (!inputsReady) return null;
    const vals = [acoesReadyPPC, vendasPPC, funilPPC].filter((p): p is number => p !== null);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [inputsReady, acoesReadyPPC, vendasPPC, funilPPC]);

  const subtitle = useMemo(() => {
    if (!inputsReady) return "Carregando aderência…";
    if (consolidatedPPC === null) return "Sem dados consolidados.";
    if (consolidatedPPC > 85) return "Aderência dentro da meta (> 85%).";
    if (consolidatedPPC >= 70) return "Aderência em atenção (70% – 85%).";
    return "Aderência abaixo da meta (< 70%).";
  }, [inputsReady, consolidatedPPC]);

  if (!inputsReady) {
    return <PpcHeroSkeleton />;
  }

  return (
    <PpcHero
      consolidatedPPC={consolidatedPPC}
      acoesPPC={acoesReadyPPC}
      vendasPPC={vendasPPC}
      funilPPC={funilPPC}
      subtitle={subtitle}
    />
  );
}

function PpcHeroSkeleton() {
  return (
    <div
      className="resumo-ppc-hero resumo-ppc-hero--sk"
      aria-busy="true"
      aria-label="Carregando PPC consolidado"
    >
      <div className="resumo-ppc-hero-left">
        <span className="sk sk-pulse resumo-sk-hero-lbl" aria-hidden />
        <span className="sk sk-pulse resumo-sk-hero-val" aria-hidden />
        <span className="sk sk-pulse resumo-sk-hero-sub" aria-hidden />
      </div>
      <div className="resumo-ppc-hero-right">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="resumo-ppc-hero-tile resumo-ppc-hero-tile--sk">
            <span className="sk sk-pulse resumo-sk-tile-lbl" aria-hidden />
            <span className="sk sk-pulse resumo-sk-tile-val" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

function PpcHero({
  consolidatedPPC,
  acoesPPC,
  vendasPPC,
  funilPPC,
  subtitle,
}: {
  consolidatedPPC: number | null;
  acoesPPC: number | null;
  vendasPPC: number | null;
  funilPPC: number | null;
  subtitle: string;
}) {
  const fmt = (v: number | null) => (v === null ? "—" : `${v}%`);
  const heroTone = ppcHeroTone(consolidatedPPC);
  const heroValCls = consolidatedPPC === null ? "is-empty" : "";
  return (
    <div className="resumo-ppc-hero" data-tone={heroTone}>
      <div className="resumo-ppc-hero-left">
        <div className="resumo-ppc-hero-label">PPC Consolidado — Visão da Semana</div>
        <div className={`resumo-ppc-hero-val ${heroValCls}`}>
          {consolidatedPPC === null ? "—" : `${consolidatedPPC}%`}
        </div>
        <div className="resumo-ppc-hero-sub">{subtitle}</div>
      </div>
      <div className="resumo-ppc-hero-right">
        <HeroTile lbl="Ações" val={fmt(acoesPPC)} ppc={acoesPPC} />
        <HeroTile lbl="Vendas" val={fmt(vendasPPC)} ppc={vendasPPC} />
        <HeroTile lbl="Funil" val={fmt(funilPPC)} ppc={funilPPC} />
      </div>
    </div>
  );
}

function HeroTile({ lbl, val, ppc }: { lbl: string; val: string; ppc: number | null }) {
  const tone = ppc === null ? "empty" : ppcHeroTone(ppc);
  const palette =
    tone === "ok"
      ? { bg: "#d1fae5", border: "#34d399", fg: "#047857" }
      : tone === "warn"
        ? { bg: "#fef3c7", border: "#fbbf24", fg: "#b45309" }
        : tone === "alert"
          ? { bg: "#fecdd3", border: "#fb7185", fg: "#be123c" }
          : { bg: "#f1f5f9", border: "#cbd5e1", fg: "#64748b" };
  return (
    <div
      className="resumo-ppc-hero-tile"
      data-tone={tone}
      style={{
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        color: palette.fg,
      }}
    >
      <span className="resumo-ppc-hero-tile-lbl" style={{ color: palette.fg }}>
        {lbl}
      </span>
      <span className="resumo-ppc-hero-tile-val" style={{ color: palette.fg }}>
        {val}
      </span>
    </div>
  );
}

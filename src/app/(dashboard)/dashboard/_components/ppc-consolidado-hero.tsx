"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import { useResourceVersion } from "@/lib/dashboard/data-bus";
import {
  previousReuniaoTuesdayIso,
  weeklyActionsWeekStartFromReuniao,
} from "@/lib/dashboard/reuniao-week";
import { listWeeklyActions, type WeeklyActionDTO } from "@/lib/weekly-actions/api";

import { avgFunilPpc, calcPPC } from "./resumo-ppc";
import type { FunnelNumbers, Taxas } from "./types";

const PPC_TIP_CONSOLIDADO = "Média de Ações + Vendas + Funil. Ex.: (63% + 0% + 25%) ÷ 3 = 29%.";
const PPC_TIP_ACOES = "Quanto das ações da semana anterior foi cumprido (realizado ÷ meta).";
const PPC_TIP_VENDAS = "Vendas da semana ÷ meta de vendas da semana (parte do plano do mês).";
const PPC_TIP_FUNIL =
  "Média do avanço em leads, visitas, pastas e vendas frente ao necessário para a meta.";

type Props = {
  meta: number;
  taxas: Taxas;
  real: FunnelNumbers;
  empreendimentoIds: number[];
  funnelLoading: boolean;
  pastasLoading: boolean;
  salesPlanLoading: boolean;
  taxasLoading: boolean;
  /** Rótulo da semana de reunião (ex.: 28/07 – 03/08). */
  weekLabel?: string;
};

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

export function PpcConsolidadoHero({
  meta,
  taxas,
  real,
  empreendimentoIds,
  funnelLoading,
  pastasLoading,
  salesPlanLoading,
  taxasLoading,
  weekLabel,
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
    // Mesma regra do dash vendas: ações da semana de reunião anterior.
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

  const semDadosBQ =
    inputsReady && real.leads === 0 && real.visitas === 0 && real.pastas === 0 && real.vendas === 0;

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
    if (semDadosBQ) return "Sem dados consolidados no BigQuery para a semana.";
    if (consolidatedPPC === null) return "Sem dados consolidados.";
    if (consolidatedPPC > 85) return "Aderência dentro da meta (> 85%).";
    if (consolidatedPPC >= 70) return "Aderência em atenção (70% – 85%).";
    return "Aderência abaixo da meta (< 70%).";
  }, [inputsReady, semDadosBQ, consolidatedPPC]);

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
      weekLabel={weekLabel}
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
  weekLabel,
}: {
  consolidatedPPC: number | null;
  acoesPPC: number | null;
  vendasPPC: number | null;
  funilPPC: number | null;
  subtitle: string;
  weekLabel?: string;
}) {
  const fmt = (v: number | null) => (v === null ? "—" : `${v}%`);
  const heroTone = ppcHeroTone(consolidatedPPC);
  const heroValCls = consolidatedPPC === null ? "is-empty" : "";
  return (
    <div className="resumo-ppc-hero" data-tone={heroTone}>
      <div className="resumo-ppc-hero-left">
        <div className="resumo-ppc-hero-label">
          PPC Consolidado — Visão da Semana
          {weekLabel ? ` · ${weekLabel}` : ""}
          <PpcTip text={PPC_TIP_CONSOLIDADO} label="Como o PPC consolidado é calculado" />
        </div>
        <div className={`resumo-ppc-hero-val ${heroValCls}`}>
          {consolidatedPPC === null ? "—" : `${consolidatedPPC}%`}
        </div>
        <div className="resumo-ppc-hero-sub">{subtitle}</div>
      </div>
      <div className="resumo-ppc-hero-right">
        <HeroTile lbl="Ações" val={fmt(acoesPPC)} ppc={acoesPPC} tip={PPC_TIP_ACOES} />
        <HeroTile lbl="Vendas" val={fmt(vendasPPC)} ppc={vendasPPC} tip={PPC_TIP_VENDAS} />
        <HeroTile lbl="Funil" val={fmt(funilPPC)} ppc={funilPPC} tip={PPC_TIP_FUNIL} />
      </div>
    </div>
  );
}

function PpcTip({ text, label }: { text: string; label: string }) {
  return (
    <button type="button" className="resumo-ppc-tip" aria-label={label}>
      <Info size={13} strokeWidth={2.25} aria-hidden />
      <span className="resumo-ppc-tip-pop" role="tooltip">
        {text}
      </span>
    </button>
  );
}

function HeroTile({
  lbl,
  val,
  ppc,
  tip,
}: {
  lbl: string;
  val: string;
  ppc: number | null;
  tip: string;
}) {
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
        <PpcTip text={tip} label={`Como ${lbl.toLowerCase()} é calculado`} />
      </span>
      <span className="resumo-ppc-hero-tile-val" style={{ color: palette.fg }}>
        {val}
      </span>
    </div>
  );
}

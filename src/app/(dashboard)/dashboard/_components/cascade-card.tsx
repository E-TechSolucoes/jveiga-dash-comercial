"use client";

import {
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Home,
  Radio,
  ShieldAlert,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import {
  computeCascade,
  fmt,
  pct,
  stageStatus,
  type FunnelNumbers,
  type StageStatus,
  type Taxas,
} from "./types";

type Props = {
  semana: number;
  meta: number;
  onMetaChange: (v: number) => void;
  taxas: Taxas;
  real: FunnelNumbers;
  leadsHistoricoMensalMeta?: number;
};

type StageDef = {
  key: keyof FunnelNumbers;
  label: string;
  Icon: LucideIcon;
  real: number;
  target: number;
  /** Vendas: período / total histórico — barra e status como % do histórico no período. */
  vendasHistorico?: boolean;
};

function Stage({ label, Icon, real, target, vendasHistorico }: Omit<StageDef, "key">) {
  const progress = vendasHistorico
    ? target > 0
      ? Math.min(100, Math.round((real / target) * 100))
      : 0
    : Math.min(100, pct(real, target));
  const status: StageStatus = vendasHistorico
    ? target <= 0
      ? "ok"
      : progress >= 80
        ? "ok"
        : progress >= 50
          ? "warn"
          : "bad"
    : stageStatus(real, target);
  const hit = vendasHistorico ? target > 0 && progress >= 100 : real >= target;
  return (
    <div className="stage" data-st={status}>
      <div className="stage-head">
        <div className="stage-ico">
          <Icon aria-hidden />
        </div>
        <span className="stage-dot" aria-hidden />
      </div>
      <div className="stage-lbl">{label}</div>
      <div className="stage-vals">
        <span className="stage-real">{fmt(real)}</span>
        <span className="stage-target">/ {vendasHistorico && target <= 0 ? "—" : fmt(target)}</span>
      </div>
      <div className="stage-bar" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="stage-status">
        {vendasHistorico ? (
          <>
            {target <= 0 ? (
              <>Sem vendas no histórico</>
            ) : hit ? (
              <>
                <CheckCircle2 size={13} strokeWidth={2.25} /> 100% do histórico no período
              </>
            ) : (
              <>{progress}% do histórico no período</>
            )}
          </>
        ) : hit ? (
          <>
            <CheckCircle2 size={13} strokeWidth={2.25} /> Bateu
          </>
        ) : (
          <>Falta {fmt(target - real)}</>
        )}
      </div>
    </div>
  );
}

export function CascadeCard({
  semana,
  meta,
  onMetaChange,
  taxas,
  real,
  leadsHistoricoMensalMeta,
}: Props) {
  const target = computeCascade(meta, taxas);
  const leadsTarget = Math.max(1, Math.round(leadsHistoricoMensalMeta ?? target.leads));

  const vendasHistoricoTotal = Math.max(0, Math.round(real.vendasAcumuladoHistorico ?? 0));
  const vendasTargetDisplay = vendasHistoricoTotal;

  const stages: StageDef[] = [
    { key: "leads", label: "Leads", Icon: Radio, real: real.leads, target: leadsTarget },
    { key: "visitas", label: "Visitas", Icon: Home, real: real.visitas, target: target.visitas },
    { key: "pastas", label: "Pastas", Icon: FolderOpen, real: real.pastas, target: target.pastas },
    {
      key: "vendas",
      label: "Vendas",
      Icon: Trophy,
      real: real.vendas,
      target: vendasTargetDisplay,
      vendasHistorico: true,
    },
  ];

  const worst = stages
    .filter((s) => !s.vendasHistorico)
    .reduce((w, s) => (pct(s.real, s.target) < pct(w.real, w.target) ? s : w));
  const worstPct = pct(worst.real, worst.target);

  let insightStatus: StageStatus = "ok";
  let InsightIcon: LucideIcon = CheckCircle2;
  let insightText: React.ReactNode = "Funil saudável — todos os estágios no rumo da meta";

  if (worstPct < 50) {
    insightStatus = "bad";
    InsightIcon = AlertOctagon;
    insightText = (
      <>
        Gargalo crítico em <strong>{worst.label.toLowerCase()}</strong>
        {": "}faltam {fmt(worst.target - worst.real)} para sustentar a meta
      </>
    );
  } else if (worstPct < 80) {
    insightStatus = "warn";
    InsightIcon = ShieldAlert;
    insightText = (
      <>
        Atenção em <strong>{worst.label.toLowerCase()}</strong>
        {": "}faltam {fmt(worst.target - worst.real)} para bater a meta
      </>
    );
  }

  return (
    <section className="cascade" aria-label="Cascata da Meta">
      <div className="cascade-head">
        <div>
          <div className="cascade-title">
            <span className="title-ico" aria-hidden>
              <Target size={18} strokeWidth={2} />
            </span>
            Cascata da Meta — Semana {semana}
          </div>
          <div className="cascade-sub">
            Conversões: {(taxas.lv * 100).toFixed(0)}% lead→visita · {(taxas.vp * 100).toFixed(0)}%
            visita→pasta · {(taxas.pv * 100).toFixed(0)}% pasta→venda
          </div>
        </div>
        <div className="meta-edit">
          <label htmlFor="meta-vendas">Meta de vendas</label>
          <input
            id="meta-vendas"
            type="number"
            min={1}
            value={meta}
            onChange={(e) => onMetaChange(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>

      <div className="cascade-row">
        {stages.map((stage, i) => (
          <StepFragment key={stage.key} stage={stage} showArrow={i < stages.length - 1} />
        ))}
      </div>

      <div className="cascade-insight" data-st={insightStatus}>
        <InsightIcon size={17} strokeWidth={2} aria-hidden />
        <span>{insightText}</span>
      </div>
    </section>
  );
}

function StepFragment({ stage, showArrow }: { stage: StageDef; showArrow: boolean }) {
  return (
    <>
      <Stage
        label={stage.label}
        Icon={stage.Icon}
        real={stage.real}
        target={stage.target}
        vendasHistorico={stage.vendasHistorico}
      />
      {showArrow && (
        <div className="stage-arrow" aria-hidden>
          <ChevronRight size={20} strokeWidth={1.5} />
        </div>
      )}
    </>
  );
}

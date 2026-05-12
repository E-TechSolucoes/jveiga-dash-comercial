"use client";

import {
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Home,
  Info,
  Radio,
  ShieldAlert,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import {
  computeCascadeRemaining,
  fmt,
  pct,
  stageStatus,
  type FunnelNumbers,
  type StageStatus,
  type Taxas,
} from "./types";

export type GoalBreakdownEntry = {
  id: number;
  name: string;
  value: number;
};

type Props = {
  semana: number;
  meta: number;
  onMetaChange: (v: number) => void;
  taxas: Taxas;
  real: FunnelNumbers;
  goalsBreakdown?: GoalBreakdownEntry[];
};

type StageDef = {
  key: keyof FunnelNumbers;
  label: string;
  Icon: LucideIcon;
  real: number;
  target: number;
};

function Stage({ label, Icon, real, target }: Omit<StageDef, "key">) {
  const progress = Math.min(100, pct(real, target));
  const status: StageStatus = stageStatus(real, target);
  const hit = real >= target;
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
        <span className="stage-target">/ {fmt(target)}</span>
      </div>
      <div className="stage-bar" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="stage-status">
        {hit ? (
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

export function CascadeCard({ semana, meta, onMetaChange, taxas, real, goalsBreakdown }: Props) {
  const breakdown = goalsBreakdown ?? [];
  const showBreakdown = breakdown.length > 1;
  const breakdownTotal = breakdown.reduce((sum, g) => sum + g.value, 0);
  const targets = computeCascadeRemaining({
    meta,
    taxas,
    vendasRealizadas: real.vendas,
    real: { leads: real.leads, visitas: real.visitas, pastas: real.pastas },
  });

  const stages: StageDef[] = [
    { key: "leads", label: "Leads", Icon: Radio, real: real.leads, target: targets.leads },
    { key: "visitas", label: "Visitas", Icon: Home, real: real.visitas, target: targets.visitas },
    { key: "pastas", label: "Pastas", Icon: FolderOpen, real: real.pastas, target: targets.pastas },
    { key: "vendas", label: "Vendas", Icon: Trophy, real: real.vendas, target: meta },
  ];

  // "worst" diagnostica gargalo no funil de pré-venda; exclui Vendas para não
  // duplicar a mensagem de "Meta atingida".
  const worst = stages
    .filter((s) => s.key !== "vendas")
    .reduce((w, s) => (pct(s.real, s.target) < pct(w.real, w.target) ? s : w));
  const worstPct = pct(worst.real, worst.target);

  let insightStatus: StageStatus = "ok";
  let InsightIcon: LucideIcon = CheckCircle2;
  let insightText: React.ReactNode = "Funil saudável — todos os estágios no rumo da meta";

  if (targets.metaAtingida) {
    insightText = "Meta de vendas atingida — pipeline coberto";
  } else if (worstPct < 50) {
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
          <label htmlFor="meta-vendas">
            Meta de vendas
            {showBreakdown && (
              <button type="button" className="meta-info" aria-label="Detalhes da meta">
                <Info size={14} strokeWidth={2} aria-hidden />
                <span className="meta-info-pop" role="tooltip">
                  <span className="meta-info-pop-title">Meta por empreendimento</span>
                  <ul>
                    {breakdown.map((g) => (
                      <li key={g.id}>
                        <span>{g.name}</span>
                        <span>{fmt(g.value)}</span>
                      </li>
                    ))}
                    <li className="meta-info-pop-total">
                      <span>Total</span>
                      <span>{fmt(breakdownTotal)}</span>
                    </li>
                  </ul>
                </span>
              </button>
            )}
          </label>
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
      <Stage label={stage.label} Icon={stage.Icon} real={stage.real} target={stage.target} />
      {showArrow && (
        <div className="stage-arrow" aria-hidden>
          <ChevronRight size={20} strokeWidth={1.5} />
        </div>
      )}
    </>
  );
}

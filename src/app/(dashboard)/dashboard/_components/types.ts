export type TabId =
  | "resumo"
  | "checklist"
  | "recep"
  | "auditoria"
  | "pastas"
  | "gestao-acoes"
  | "imob"
  | "conhecimento";

export type PeriodoId = "semana" | "mes" | "ultimo_mes" | "custom";

export type EmpresaOption = {
  value: string;
  label: string;
};

export type FunnelNumbers = {
  leads: number;
  visitas: number;
  pastas: number;
  vendas: number;
  /** Total histórico de vendas (Reservas com data_envio_sienge), mesmo empreendimento. */
  vendasAcumuladoHistorico?: number;
};

export type Taxas = {
  lv: number; // lead → visita
  vp: number; // visita → pasta
  pv: number; // pasta → venda
};

export type PerformanceNumbers = {
  corretores: number;
  vgvMedio: number; // absolute (BRL)
  vgvPeriodo: number; // absolute (BRL)
};

export type PastasKpis = {
  total: number;
  emAndamento: number;
  concluidas: number;
  distratadas: number;
};

export type StageStatus = "ok" | "warn" | "bad";

export function pct(real: number, target: number): number {
  return target > 0 ? Math.round((real / target) * 100) : 0;
}

export function stageStatus(real: number, target: number): StageStatus {
  const p = pct(real, target);
  if (p >= 80) return "ok";
  if (p >= 50) return "warn";
  return "bad";
}

export function computeCascade(meta: number, taxas: Taxas): FunnelNumbers {
  const pastas = Math.ceil(meta / taxas.pv);
  const visitas = Math.ceil(pastas / taxas.vp);
  const leads = Math.ceil(visitas / taxas.lv);
  return { vendas: meta, pastas, visitas, leads };
}

export type CascadeContext = {
  meta: number;
  taxas: Taxas;
  vendasRealizadas: number;
  real: Pick<FunnelNumbers, "leads" | "visitas" | "pastas">;
};

export type CascadeTargets = {
  leads: number;
  visitas: number;
  pastas: number;
  remainingVendas: number;
  metaAtingida: boolean;
};

function ceilSafe(numerator: number, rate: number): number {
  return rate > 0 ? Math.ceil(numerator / rate) : 0;
}

export function computeCascadeRemaining(ctx: CascadeContext): CascadeTargets {
  const remainingVendas = Math.max(0, ctx.meta - ctx.vendasRealizadas);
  const metaAtingida = remainingVendas === 0;

  const pastasNeeded = ceilSafe(remainingVendas, ctx.taxas.pv);
  const visitasNeeded = ceilSafe(pastasNeeded, ctx.taxas.vp);
  const leadsNeeded = ceilSafe(visitasNeeded, ctx.taxas.lv);

  return {
    pastas: ctx.real.pastas + pastasNeeded,
    visitas: ctx.real.visitas + visitasNeeded,
    leads: ctx.real.leads + leadsNeeded,
    remainingVendas,
    metaAtingida,
  };
}

export const fmt = (n: number): string => (n ?? 0).toLocaleString("pt-BR");

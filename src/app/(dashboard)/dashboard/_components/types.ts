export type TabId =
  | "resumo"
  | "checklist"
  | "recep"
  | "pastas"
  | "arsenal"
  | "outbound"
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

export const fmt = (n: number): string => (n ?? 0).toLocaleString("pt-BR");

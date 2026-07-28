import { parseLocalYmd } from "@/lib/dashboard/reuniao-week";

import { computeCascade, type FunnelNumbers, type Taxas } from "./types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** Meta de vendas da janela: rateio diário do plano mensal (mesmo critério do dash vendas). */
export function weeklyVendasMeta(
  weekStart: string,
  weekEnd: string,
  plansByYm: Map<string, number>,
): number {
  const start = parseLocalYmd(weekStart);
  const end = parseLocalYmd(weekEnd);
  if (!start || !end) return 0;
  let total = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const monthly = plansByYm.get(`${y}-${pad2(m)}`) ?? 0;
    const dim = daysInMonth(y, m);
    if (monthly > 0 && dim > 0) total += monthly / dim;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export function calcPPC(real: number, meta: number): number | null {
  if (!Number.isFinite(meta) || meta <= 0) return null;
  return Math.round((real / meta) * 100);
}

/**
 * PPC do funil alinhado ao dash vendas: denominador = só o necessário para as
 * vendas restantes (sem somar o realizado às metas de etapa).
 */
export function avgFunilPpc(real: FunnelNumbers, vendasMeta: number, taxas: Taxas): number | null {
  if (!(vendasMeta > 0)) return null;
  const remainingVendas = Math.max(0, vendasMeta - real.vendas);
  if (remainingVendas === 0) {
    const stages = [
      calcPPC(real.leads, real.leads),
      calcPPC(real.visitas, real.visitas),
      calcPPC(real.pastas, real.pastas),
      calcPPC(real.vendas, vendasMeta),
    ].filter((p): p is number => p !== null);
    return stages.length > 0 ? Math.round(stages.reduce((a, b) => a + b, 0) / stages.length) : null;
  }
  const cascade = computeCascade(remainingVendas, taxas);
  const stages = [
    calcPPC(real.leads, cascade.leads),
    calcPPC(real.visitas, cascade.visitas),
    calcPPC(real.pastas, cascade.pastas),
    calcPPC(real.vendas, vendasMeta),
  ].filter((p): p is number => p !== null);
  if (stages.length === 0) return null;
  return Math.round(stages.reduce((a, b) => a + b, 0) / stages.length);
}

/** Metas de etapa da cascata (necessário para vendas restantes) — alinhado ao PPC do funil. */
export function cascadeStageTargets(
  real: FunnelNumbers,
  vendasMeta: number,
  taxas: Taxas,
): { leads: number; visitas: number; pastas: number; vendas: number; metaAtingida: boolean } {
  if (!(vendasMeta > 0)) {
    return { leads: 0, visitas: 0, pastas: 0, vendas: 0, metaAtingida: false };
  }
  const remainingVendas = Math.max(0, vendasMeta - real.vendas);
  if (remainingVendas === 0) {
    return {
      leads: Math.max(real.leads, 1),
      visitas: Math.max(real.visitas, 1),
      pastas: Math.max(real.pastas, 1),
      vendas: vendasMeta,
      metaAtingida: true,
    };
  }
  const cascade = computeCascade(remainingVendas, taxas);
  return {
    leads: cascade.leads,
    visitas: cascade.visitas,
    pastas: cascade.pastas,
    vendas: vendasMeta,
    metaAtingida: false,
  };
}

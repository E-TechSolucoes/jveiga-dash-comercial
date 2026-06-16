import { apiFetch } from "@/lib/auth";
import type { PastasKpis, Taxas } from "@/app/(dashboard)/dashboard/_components/types";

import type { SalesPlanByMonth } from "./sales-plans";

export type FunilPayload = {
  leads: number;
  visitas: number;
  vendas: number;
  vendasAcumuladoHistorico: number;
  ticketMedio: number;
  vgvPeriodo: number;
};

export type PastasPessoaItem = {
  pessoa: string;
  situacao: string;
  valorTotal: number;
  idsituacao: number | null;
  empreendimento: string;
  corretor: string;
  unidade: string;
  referenciaData: string | null;
  idPasta: string | null;
};

export type PastasListPayload = {
  total: number;
  items: PastasPessoaItem[];
};

export type PastasListFilters = {
  /** Busca por nome da pessoa (contém, sem acento). */
  pessoa: string;
  /** Busca por nome do corretor (contém, sem acento). */
  corretor: string;
  /** Nome exato de um empreendimento; "" = todos os selecionados. */
  empreendimento: string;
  /** Bucket de situação alinhado aos KPIs; "" = todas. */
  situacao: "" | "andamento" | "concluidas" | "distratadas";
};

export const EMPTY_PASTAS_FILTERS: PastasListFilters = {
  pessoa: "",
  corretor: "",
  empreendimento: "",
  situacao: "",
};

export type RecepHistDia = {
  data: string;
  visitas: number;
  manha: number;
  tarde: number;
};

/** Uma visita do histórico (últimos 14 dias): detalhe expandível + linha do CSV. */
export type RecepHistVisitaRow = {
  data: string;
  turno: string;
  hora: string;
  cliente: string;
  corretor: string;
  origem: string;
};

export type RecepEmpreendimentoMatched = {
  id: number | null;
  nome: string | null;
};

export type RecepApiPayload = {
  empreendimentoId: number | null;
  empreendimentoNomeMatch: string | null;
  empreendimentosMatched?: RecepEmpreendimentoMatched[];
  nomesSelecionados?: string[];
  nomeSelecionado: string;
  visitasHoje: {
    hora: string | null;
    cliente: string | null;
    origem: string | null;
    corretor: string | null;
  }[];
  plantao: {
    corretor: string | null;
    imobiliaria: string | null;
    period: string | null;
    empreendimento: string | null;
  }[];
  plantaoHistorico: {
    corretor: string | null;
    imobiliaria: string | null;
    period: string | null;
    empreendimento: string | null;
    data: string | null;
    entrada: string | null;
    saida: string | null;
  }[];
  historico: RecepHistDia[];
  historicoVisitas: RecepHistVisitaRow[];
  totals: { visitasHoje: number; visitasPeriodo: number; historicDays: number };
};

export type HistoricConversionPayload = {
  meta: {
    empreendimento: string;
    codigo_interno_dwh_leads: string;
    leads_unicos_total?: number;
    meses_com_lead?: number;
    media_historica_mensal_leads?: number;
    observacao_dados?: string;
    filtros?: Record<string, string>;
    metricas?: Record<string, string>;
  };
  por_mes: Array<{
    mes: string;
    leads: number;
    visitas: number;
    taxa_conversao_mensal_pct: number | null;
    leads_acumulado: number;
    visitas_acumulado: number;
    taxa_conversao_acumulada_pct: number | null;
  }>;
};

/** Default conversion rates — used when the historical query returns zero for a stage. */
const TAXAS_FALLBACK: Taxas = { lv: 0.15, vp: 0.2, pv: 0.5 };

/** Same-origin Next.js API route fetch (`/api/dashboard/*`) with error propagation. */
async function fetchDashboardJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Erro ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getSalesPlanByMonth(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<SalesPlanByMonth> {
  const qs = new URLSearchParams({ year: String(year), month: String(month) });
  return apiFetch<SalesPlanByMonth>(`/api/v1/sales-plans/by-month?${qs.toString()}`, {
    signal,
    cache: "no-store",
  });
}

export async function getTaxas(
  codigos: string[],
  nomes: string[],
  signal?: AbortSignal,
): Promise<Taxas> {
  const qs = new URLSearchParams({ codigos: codigos.join(","), nomes: nomes.join("||") });
  const data = await fetchDashboardJson<{ taxas?: { lv?: number; vp?: number; pv?: number } }>(
    `/api/dashboard/taxas?${qs.toString()}`,
    signal,
  );
  const t = data.taxas ?? {};
  return {
    lv: Number(t.lv) > 0 ? Number(t.lv) : TAXAS_FALLBACK.lv,
    vp: Number(t.vp) > 0 ? Number(t.vp) : TAXAS_FALLBACK.vp,
    pv: Number(t.pv) > 0 ? Number(t.pv) : TAXAS_FALLBACK.pv,
  };
}

export async function getFunil(
  codigos: string[],
  nomes: string[],
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<FunilPayload> {
  const qs = new URLSearchParams({ codigos: codigos.join(","), nomes: nomes.join("||"), from, to });
  const data = await apiFetch<Partial<FunilPayload>>(
    `/api/v1/dashboard/funil/resumo?${qs.toString()}`,
    { signal, cache: "no-store" },
  );
  return {
    leads: Number(data.leads ?? 0),
    visitas: Number(data.visitas ?? 0),
    vendas: Number(data.vendas ?? 0),
    vendasAcumuladoHistorico: Number(data.vendasAcumuladoHistorico ?? 0),
    ticketMedio: Number(data.ticketMedio ?? 0),
    vgvPeriodo: Number(data.vgvPeriodo ?? 0),
  };
}

export async function getPastasKpis(
  nomes: string[],
  codigos: string[],
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<PastasKpis> {
  const qs = new URLSearchParams({ nomes: nomes.join("||"), codigos: codigos.join(","), from, to });
  const data = await fetchDashboardJson<Partial<PastasKpis>>(
    `/api/dashboard/pastas?${qs.toString()}`,
    signal,
  );
  return {
    total: Number(data.total ?? 0),
    emAndamento: Number(data.emAndamento ?? 0),
    concluidas: Number(data.concluidas ?? 0),
    distratadas: Number(data.distratadas ?? 0),
  };
}

export async function getPastasList(
  nomes: string[],
  codigos: string[],
  from: string,
  to: string,
  page: number,
  filters: PastasListFilters,
  signal?: AbortSignal,
): Promise<PastasListPayload> {
  const qs = new URLSearchParams({
    nomes: nomes.join("||"),
    codigos: codigos.join(","),
    from,
    to,
    page: String(page),
  });
  if (filters.pessoa.trim()) qs.set("pessoa", filters.pessoa.trim());
  if (filters.corretor.trim()) qs.set("corretor", filters.corretor.trim());
  if (filters.empreendimento.trim()) qs.set("empreendimento", filters.empreendimento.trim());
  if (filters.situacao) qs.set("situacao", filters.situacao);
  const data = await fetchDashboardJson<{ total?: number; items?: PastasPessoaItem[] }>(
    `/api/dashboard/pastas/list?${qs.toString()}`,
    signal,
  );
  return {
    total: Number(data.total ?? 0),
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export function getRecep(nomes: string[], signal?: AbortSignal): Promise<RecepApiPayload> {
  const qs = new URLSearchParams({ nomes: nomes.join("||") });
  return fetchDashboardJson<RecepApiPayload>(`/api/dashboard/recep?${qs.toString()}`, signal);
}

export function getConversaoHistorica(
  codigo: string,
  nome: string,
  signal?: AbortSignal,
): Promise<HistoricConversionPayload> {
  const qs = new URLSearchParams({ codigo, nome });
  return apiFetch<HistoricConversionPayload>(
    `/api/v1/dashboard/conversao-historica?${qs.toString()}`,
    { signal, cache: "no-store" },
  );
}

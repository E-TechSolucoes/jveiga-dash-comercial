"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useFunil, usePastasKpis, useSalesPlan, useTaxas } from "@/hooks/use-dashboard";
import { useAuth } from "@/lib/auth";

import empreendimentosData from "../../../../../empreendimentos.json";
import type { GoalBreakdownEntry } from "./cascade-card";
import { TabsNav } from "./tabs-nav";
import { Topbar } from "./topbar";
import { XpBar } from "./xp-bar";
import type {
  EmpresaOption,
  FunnelNumbers,
  PastasKpis,
  PerformanceNumbers,
  PeriodoId,
  Taxas,
} from "./types";

type EmpreendimentoRow = {
  idempreendimento: number;
  empreendimento: string;
};

/** Nome do empreendimento a partir do rótulo do header (ex.: "390 - SAMBA GRAJAU" → "SAMBA GRAJAU"). */
function empreendimentoNomeFromHeaderLabel(label: string): string {
  const i = label.indexOf(" - ");
  if (i >= 0) return label.slice(i + 3).trim();
  return label.trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Match nomes do catálogo (com acento) com nomes do upstream (sem garantia de
 * acento/case). Mesma normalização usada nos filtros do BigQuery em
 * `bigquery-taxas.ts`. */
function foldName(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{M}/gu, "").toUpperCase().trim();
}

const EMPRESAS: EmpresaOption[] = (empreendimentosData as EmpreendimentoRow[]).map((row) => {
  const codigo = Number.isFinite(row.idempreendimento) ? String(row.idempreendimento) : "";
  return {
    value: codigo || `sem-codigo-${slugify(row.empreendimento)}`,
    label: codigo ? `${codigo} - ${row.empreendimento}` : row.empreendimento,
  };
});

const VALUE_TO_NOME = new Map<string, string>(
  EMPRESAS.map((e) => [e.value, empreendimentoNomeFromHeaderLabel(e.label)]),
);

function empresaTemIdNumerico(value: string): boolean {
  if (!value || value.startsWith("sem-codigo-")) return false;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0;
}

const COOKIE_EMPRESAS = "dash_empresas";
const COOKIE_MAX_AGE_SECS = 60 * 60 * 24 * 365 * 5;
const STORAGE_PERIODO = "dash.periodo";
const STORAGE_CUSTOM_FROM = "dash.customFrom";
const STORAGE_CUSTOM_TO = "dash.customTo";
const LEGACY_STORAGE_EMPRESA = "dash.empresa";

const PERIODOS_VALIDOS: readonly PeriodoId[] = ["semana", "mes", "ultimo_mes", "custom"];

const TAXAS_DEFAULT: Taxas = { lv: 0.15, vp: 0.2, pv: 0.5 };

function readEmpresasCookie(): string[] | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_EMPRESAS}=([^;]*)`));
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1] ?? "");
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // ignora cookie corrompido
  }
  return null;
}

function writeEmpresasCookie(values: string[]) {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(JSON.stringify(values));
  document.cookie = `${COOKIE_EMPRESAS}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE_SECS}; samesite=lax`;
}

function formatBrDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function computeRangeLabel(periodo: PeriodoId, customFrom: string, customTo: string): string {
  if (periodo === "custom") {
    if (!customFrom || !customTo) return "—";
    const [y1, m1, d1] = customFrom.split("-");
    const [y2, m2, d2] = customTo.split("-");
    return `${d1}/${m1}/${y1} → ${d2}/${m2}/${y2}`;
  }

  if (periodo === "ultimo_mes") {
    const today = new Date();
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return `${formatBrDate(lastMonthStart)} → ${formatBrDate(lastMonthEnd)}`;
  }

  const today = new Date();
  const from = new Date(today);
  const to = new Date(today);
  if (periodo === "semana") {
    const dow = today.getDay();
    from.setDate(today.getDate() - dow);
    to.setDate(today.getDate() + (6 - dow));
  } else if (periodo === "mes") {
    from.setDate(1);
  }
  return `${formatBrDate(from)} → ${formatBrDate(to)}`;
}

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computePeriodBounds(periodo: PeriodoId, customFrom: string, customTo: string) {
  if (periodo === "custom") {
    if (customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return null;
  }

  const today = new Date();
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const from = new Date(to);
  if (periodo === "semana") {
    const dow = to.getDay();
    from.setDate(to.getDate() - dow);
    to.setDate(to.getDate() + (6 - dow));
  } else if (periodo === "mes") {
    from.setDate(1);
  } else {
    const lastMonthStart = new Date(to.getFullYear(), to.getMonth() - 1, 1);
    const lastMonthEnd = new Date(to.getFullYear(), to.getMonth(), 0);
    return { from: toIsoDate(lastMonthStart), to: toIsoDate(lastMonthEnd) };
  }
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

type PeriodBounds = { from: string; to: string } | null;

type DashboardContextValue = {
  comercialName: string;
  empresasNomes: string[];
  empresasCodigos: string[];
  empreendimentoIds: number[];
  periodBounds: PeriodBounds;
  empresasKey: string;
  semana: number;
  setSemana: (next: number) => void;
  meta: number;
  handleMetaChange: (v: number) => void;
  taxas: Taxas;
  real: FunnelNumbers;
  performance: PerformanceNumbers;
  goalsBreakdown: GoalBreakdownEntry[];
  funnelLoading: boolean;
  salesPlanLoading: boolean;
  taxasLoading: boolean;
  pastasKpis: PastasKpis | null;
  pastasLoading: boolean;
  pastasError: string | null;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboardData(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within <DashboardProvider>");
  }
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const persistedFilters = useMemo(() => {
    const fallbackEmpresas = EMPRESAS[0]?.value ? [EMPRESAS[0].value] : [];
    if (typeof window === "undefined") {
      return {
        empresas: fallbackEmpresas,
        periodo: "ultimo_mes" as PeriodoId,
        customFrom: "",
        customTo: "",
      };
    }
    try {
      const validValues = new Set(EMPRESAS.map((e) => e.value));
      let empresas: string[];

      const cookieValues = readEmpresasCookie();
      if (cookieValues !== null) {
        // honra o estado persistido — inclusive vazio, se o usuário desmarcou tudo.
        empresas = cookieValues.filter((v) => validValues.has(v));
      } else {
        const legacy = window.localStorage.getItem(LEGACY_STORAGE_EMPRESA);
        empresas = legacy && validValues.has(legacy) ? [legacy] : fallbackEmpresas;
      }

      const storedPeriodo = window.localStorage.getItem(STORAGE_PERIODO);
      const periodo =
        storedPeriodo && PERIODOS_VALIDOS.includes(storedPeriodo as PeriodoId)
          ? (storedPeriodo as PeriodoId)
          : ("ultimo_mes" as PeriodoId);
      return {
        empresas,
        periodo,
        customFrom: window.localStorage.getItem(STORAGE_CUSTOM_FROM) ?? "",
        customTo: window.localStorage.getItem(STORAGE_CUSTOM_TO) ?? "",
      };
    } catch {
      return {
        empresas: fallbackEmpresas,
        periodo: "ultimo_mes" as PeriodoId,
        customFrom: "",
        customTo: "",
      };
    }
  }, []);

  // Filters
  const [empresas, setEmpresas] = useState<string[]>(persistedFilters.empresas);
  const [periodo, setPeriodo] = useState<PeriodoId>(persistedFilters.periodo);
  const [customFrom, setCustomFrom] = useState(persistedFilters.customFrom);
  const [customTo, setCustomTo] = useState(persistedFilters.customTo);
  const comercialName = session?.user?.name?.trim() ?? "";

  const empresasEfetivas = useMemo(() => {
    const allowedSet = new Set(EMPRESAS.map((opt) => opt.value));
    return empresas.filter((v) => allowedSet.has(v));
  }, [empresas]);

  useEffect(() => {
    try {
      writeEmpresasCookie(empresasEfetivas);
      window.localStorage.setItem(STORAGE_PERIODO, periodo);
      window.localStorage.setItem(STORAGE_CUSTOM_FROM, customFrom);
      window.localStorage.setItem(STORAGE_CUSTOM_TO, customTo);
    } catch {
      // ignore
    }
  }, [empresasEfetivas, periodo, customFrom, customTo]);

  // Meta override do usuário (a meta-base vem da API de sales-plans).
  const [metaUserOverride, setMetaUserOverride] = useState<number | null>(null);

  // Semana atual — compartilhada entre Armas (arsenal) e Outbound.
  const [semana, setSemana] = useState(1);

  // Surface-level gamification values — placeholders until the remaining tabs exist.
  const skinsUnlocked = 1;
  const skinsTotal = 7;
  const checklistPct = 0;
  const level = Math.max(1, Math.floor(checklistPct / 15) + 1);

  // Defer date-dependent label to the client to avoid SSR/CSR timezone drift.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const dateRangeLabel = useMemo(
    () => (mounted ? computeRangeLabel(periodo, customFrom, customTo) : "—"),
    [mounted, periodo, customFrom, customTo],
  );

  const empresasNomes = useMemo<string[]>(
    () =>
      empresasEfetivas.map((v) => VALUE_TO_NOME.get(v) ?? "").filter((s) => s.trim().length > 0),
    [empresasEfetivas],
  );

  const empresasCodigos = useMemo<string[]>(
    () => empresasEfetivas.filter((v) => empresaTemIdNumerico(v)),
    [empresasEfetivas],
  );

  // O backend do stand-check exige empreendimento_id (int64 > 0). O catálogo
  // contém alguns rows sem código (value "sem-codigo-...") — esses ficam
  // fora desta lista.
  const empreendimentoIds = useMemo<number[]>(
    () =>
      empresasCodigos.map((s) => Number.parseInt(s, 10)).filter((n) => Number.isFinite(n) && n > 0),
    [empresasCodigos],
  );

  const periodBounds = useMemo(
    () => computePeriodBounds(periodo, customFrom, customTo),
    [periodo, customFrom, customTo],
  );

  // Keys evitam re-render loops quando arrays trocam de identidade sem mudar conteúdo.
  const empresasNomesKey = empresasNomes.join("||");
  const empreendimentoIdsKey = empreendimentoIds.join(",");

  // Snapshot da seleção do último commit — usado pra invalidar `metaUserOverride`
  // quando a seleção muda (padrão render-phase, ver bloco após `metaFromGoals`).
  const [prevSelectionKey, setPrevSelectionKey] = useState(empreendimentoIdsKey);

  const { currentYear, currentMonth } = useMemo(() => {
    const d = new Date();
    return { currentYear: d.getFullYear(), currentMonth: d.getMonth() + 1 };
  }, []);

  // ── Dados servidos por TanStack Query ────────────────────────────────────
  const salesPlanQuery = useSalesPlan(currentYear, currentMonth);
  const taxasQuery = useTaxas(empresasCodigos, empresasNomes);
  const funilQuery = useFunil(empresasCodigos, empresasNomes, periodBounds);
  const pastasQuery = usePastasKpis(empresasNomes, empresasCodigos, periodBounds);

  const salesPlan = salesPlanQuery.data ?? null;

  const goalsBreakdown = useMemo<GoalBreakdownEntry[]>(() => {
    if (!salesPlan) return [];
    // O `empreendimento_id` que o upstream devolve não bate com o
    // `codigo_interno_do_empreendimento` do catálogo (Conceito Poá vira 18 lá e
    // 347 aqui). Casamos por nome normalizado, que é estável em ambos.
    const selected = new Set(empresasNomes.map(foldName));
    return salesPlan.items
      .filter((it) => selected.has(foldName(it.empreendimento_name)))
      .map((it) => ({
        id: it.empreendimento_id,
        name: it.empreendimento_name,
        value: it.planned_sales,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesPlan, empresasNomesKey]);

  const metaFromGoals = useMemo(
    () => goalsBreakdown.reduce((sum, g) => sum + g.value, 0),
    [goalsBreakdown],
  );

  // Sempre que a seleção muda, descartamos o override do usuário — a meta volta
  // a ser dirigida pela API. Padrão render-phase do React (setState durante
  // render é descartado e re-rendado imediatamente; sem ciclo de efeito):
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (empreendimentoIdsKey !== prevSelectionKey) {
    setPrevSelectionKey(empreendimentoIdsKey);
    setMetaUserOverride(null);
  }
  const meta = metaUserOverride ?? metaFromGoals;

  const handleMetaChange = (v: number) => setMetaUserOverride(v);

  const taxas = taxasQuery.data ?? TAXAS_DEFAULT;

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

  const performance = useMemo<PerformanceNumbers>(
    () => ({
      corretores: 24,
      vgvMedio: funil?.ticketMedio ?? 0,
      vgvPeriodo: funil?.vgvPeriodo ?? 0,
    }),
    [funil],
  );

  const funnelLoading = funilQuery.isFetching;
  const salesPlanLoading = salesPlanQuery.isFetching;
  const taxasLoading = taxasQuery.isFetching;
  const pastasLoading = pastasQuery.isFetching;
  const pastasError = pastasQuery.isError
    ? pastasQuery.error instanceof Error
      ? pastasQuery.error.message
      : "Não foi possível carregar os totais de pastas."
    : null;

  // Sufixo passado pra `key=` em tabs com fetches dependentes do filtro,
  // garantindo remount limpo quando a seleção muda.
  const empresasKey = empresasEfetivas.join("|");

  const contextValue = useMemo<DashboardContextValue>(
    () => ({
      comercialName,
      empresasNomes,
      empresasCodigos,
      empreendimentoIds,
      periodBounds,
      empresasKey,
      semana,
      setSemana,
      meta,
      handleMetaChange,
      taxas,
      real,
      performance,
      goalsBreakdown,
      funnelLoading,
      salesPlanLoading,
      taxasLoading,
      pastasKpis,
      pastasLoading,
      pastasError,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      comercialName,
      empresasNomesKey,
      empresasCodigos,
      empreendimentoIdsKey,
      periodBounds,
      empresasKey,
      semana,
      meta,
      taxas,
      real,
      performance,
      goalsBreakdown,
      funnelLoading,
      salesPlanLoading,
      taxasLoading,
      pastasKpis,
      pastasLoading,
      pastasError,
    ],
  );

  return (
    <div className="app">
      <div className="shell">
        <div className="dash-head">
          <Topbar
            empresas={empresasEfetivas}
            empresaOptions={EMPRESAS}
            onEmpresasChange={setEmpresas}
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            dateRangeLabel={dateRangeLabel}
            comercialName={comercialName}
            skinsUnlocked={skinsUnlocked}
            skinsTotal={skinsTotal}
            metaReal={real.vendas}
            metaTarget={meta}
            checklistPct={checklistPct}
          />
        </div>

        <XpBar level={level} pct={checklistPct} />
        <TabsNav />

        <DashboardContext.Provider value={contextValue}>{children}</DashboardContext.Provider>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth";

import empreendimentosData from "../../../../../empreendimentos.json";
import { ArsenalTab } from "./arsenal-tab";
import { CascadeCard } from "./cascade-card";
import { CheckTab } from "./check-tab";
import { ConhecimentoTab } from "./conhecimento-tab";
import { FunnelSection } from "./funnel-section";
import { ImobTab } from "./imob-tab";
import { OutboundTab } from "./outbound-tab";
import { PastasTab, type PastasKpis } from "./pastas-tab";
import { RankingSkinsSection } from "./ranking-skins-section";
import { RecepTab } from "./recep-tab";
import { RegrasOuroCard } from "./regras-ouro-card";
import { TabsNav } from "./tabs-nav";
import { Topbar } from "./topbar";
import { XpBar } from "./xp-bar";
import type {
  EmpresaOption,
  FunnelNumbers,
  PerformanceNumbers,
  PeriodoId,
  TabId,
  Taxas,
} from "./types";

type EmpreendimentoRow = {
  codigo_interno_do_empreendimento: string | null;
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

const EMPRESAS: EmpresaOption[] = (empreendimentosData as EmpreendimentoRow[]).map((row) => {
  const codigo = row.codigo_interno_do_empreendimento ?? "";
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

function readEmpresasCookie(): string[] | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_EMPRESAS}=([^;]*)`));
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1] ?? "");
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      const arr = parsed.filter((v): v is string => typeof v === "string");
      return arr.length > 0 ? arr : null;
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

export function DashboardShell() {
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
      let empresas: string[] | null = null;

      const cookieValues = readEmpresasCookie();
      if (cookieValues) {
        empresas = cookieValues.filter((v) => validValues.has(v));
      }
      if (!empresas || empresas.length === 0) {
        const legacy = window.localStorage.getItem(LEGACY_STORAGE_EMPRESA);
        if (legacy && validValues.has(legacy)) empresas = [legacy];
      }
      if (!empresas || empresas.length === 0) empresas = fallbackEmpresas;

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
    const filtered = empresas.filter((v) => allowedSet.has(v));
    if (filtered.length > 0) return filtered;
    return EMPRESAS[0]?.value ? [EMPRESAS[0].value] : [];
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

  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>("resumo");

  // Meta / Conversions (editable)
  const [meta, setMeta] = useState(8);
  const taxas: Taxas = { lv: 0.15, vp: 0.2, pv: 0.5 };

  // Semana atual — compartilhada entre Resumo e Armas (arsenal)
  const [semana, setSemana] = useState(1);

  const [real, setReal] = useState<FunnelNumbers>({
    leads: 0,
    visitas: 0,
    pastas: 0,
    vendas: 0,
    vendasAcumuladoHistorico: 0,
  });
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [pastasKpis, setPastasKpis] = useState<PastasKpis | null>(null);
  const [pastasLoading, setPastasLoading] = useState(false);
  const [pastasError, setPastasError] = useState<string | null>(null);
  const [leadsHistoricoMensalMeta, setLeadsHistoricoMensalMeta] = useState(0);
  const [performance, setPerformance] = useState<PerformanceNumbers>({
    corretores: 24,
    vgvMedio: 0,
    vgvPeriodo: 0,
  });

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

  // Empresa "primária" para endpoints que ainda são single-empreendimento
  // (conversao-historica).
  const empresaPrimaria = empresasEfetivas[0] ?? "";
  const empresaPrimariaNome = empresasNomes[0] ?? "";

  const periodBounds = useMemo(
    () => computePeriodBounds(periodo, customFrom, customTo),
    [periodo, customFrom, customTo],
  );

  // Keys evitam re-render loops quando arrays trocam de identidade sem mudar conteúdo.
  const empresasNomesKey = empresasNomes.join("||");
  const empresasCodigosKey = empresasCodigos.join(",");

  useEffect(() => {
    if (empresasNomes.length === 0 || !periodBounds) return;
    const ac = new AbortController();
    void (async () => {
      try {
        setFunnelLoading(true);
        const params = new URLSearchParams({
          codigos: empresasCodigos.join(","),
          nomes: empresasNomes.join("||"),
          from: periodBounds.from,
          to: periodBounds.to,
        });
        const res = await fetch(`/api/dashboard/funil?${params.toString()}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "<no body>");
          console.error("[funil] non-OK", { status: res.status, body, url: params.toString() });
          return;
        }
        const data = (await res.json()) as {
          leads?: number;
          visitas?: number;
          vendas?: number;
          vendasAcumuladoHistorico?: number;
          ticketMedio?: number;
          vgvPeriodo?: number;
        };
        console.error("[funil] client received", { url: params.toString(), data });
        if (ac.signal.aborted) return;
        setReal((prev) => ({
          ...prev,
          leads: Number(data.leads ?? 0),
          visitas: Number(data.visitas ?? 0),
          vendas: Number(data.vendas ?? 0),
          vendasAcumuladoHistorico: Number(data.vendasAcumuladoHistorico ?? 0),
        }));
        setPerformance((prev) => ({
          ...prev,
          vgvMedio: Number(data.ticketMedio ?? 0),
          vgvPeriodo: Number(data.vgvPeriodo ?? 0),
        }));
      } catch {
        // `fetch` rejects on `ac.abort()` (deps change / unmount); ignore.
      } finally {
        if (!ac.signal.aborted) setFunnelLoading(false);
      }
    })();
    return () => ac.abort(new DOMException("Superseded by newer funnel request", "AbortError"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresasNomesKey, empresasCodigosKey, periodBounds]);

  useEffect(() => {
    const ac = new AbortController();

    void (async () => {
      if (ac.signal.aborted) return;
      if (empresasNomes.length === 0 || !periodBounds) {
        setPastasKpis(null);
        setPastasError(null);
        setPastasLoading(false);
        setReal((prev) => ({ ...prev, pastas: 0 }));
        return;
      }

      setPastasLoading(true);
      setPastasError(null);
      setPastasKpis(null);

      try {
        const params = new URLSearchParams({
          nomes: empresasNomes.join("||"),
          codigos: empresasCodigos.join(","),
          from: periodBounds.from,
          to: periodBounds.to,
        });
        const res = await fetch(`/api/dashboard/pastas?${params.toString()}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (ac.signal.aborted) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          console.error("[pastas] non-OK", {
            status: res.status,
            body,
            url: params.toString(),
          });
          setPastasKpis(null);
          setPastasError(body?.error ?? "Não foi possível carregar os totais de pastas.");
          setReal((prev) => ({ ...prev, pastas: 0 }));
          return;
        }
        const data = (await res.json()) as Partial<PastasKpis>;
        if (ac.signal.aborted) return;
        const kpis: PastasKpis = {
          total: Number(data.total ?? 0),
          emAndamento: Number(data.emAndamento ?? 0),
          concluidas: Number(data.concluidas ?? 0),
          distratadas: Number(data.distratadas ?? 0),
        };
        setPastasKpis(kpis);
        setPastasError(null);
        setReal((prev) => ({ ...prev, pastas: kpis.total }));
      } catch {
        if (ac.signal.aborted) return;
        setPastasKpis(null);
        setPastasError("Não foi possível carregar os totais de pastas.");
        setReal((prev) => ({ ...prev, pastas: 0 }));
      } finally {
        if (!ac.signal.aborted) setPastasLoading(false);
      }
    })();

    return () => ac.abort(new DOMException("Superseded by newer pastas request", "AbortError"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresasNomesKey, empresasCodigosKey, periodBounds]);

  // conversao-historica: endpoint single-empreendimento. Usa o primeiro selecionado.
  useEffect(() => {
    if (!empresaPrimariaNome) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const params = new URLSearchParams({
          codigo: empresaPrimaria.startsWith("sem-codigo-") ? "" : empresaPrimaria,
          nome: empresaPrimariaNome,
        });
        const res = await fetch(`/api/dashboard/conversao-historica?${params.toString()}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          meta?: { media_historica_mensal_leads?: number };
        };
        if (ac.signal.aborted) return;
        setLeadsHistoricoMensalMeta(Number(data.meta?.media_historica_mensal_leads ?? 0));
      } catch {
        if (!ac.signal.aborted) setLeadsHistoricoMensalMeta(0);
      }
    })();
    return () =>
      ac.abort(new DOMException("Superseded by newer conversão-histórica request", "AbortError"));
  }, [empresaPrimaria, empresaPrimariaNome]);

  // Sufixo passado pra `key=` em tabs com fetches dependentes do filtro,
  // garantindo remount limpo quando a seleção muda.
  const empresasKey = empresasEfetivas.join("|");

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
        <TabsNav active={activeTab} onSelect={setActiveTab} />

        <div className="tc" data-active={activeTab === "resumo"}>
          <CascadeCard
            semana={semana}
            meta={meta}
            onMetaChange={setMeta}
            taxas={taxas}
            real={real}
            leadsHistoricoMensalMeta={leadsHistoricoMensalMeta}
          />
          <FunnelSection
            real={real}
            metaVendas={meta}
            performance={performance}
            loading={funnelLoading}
          />
          <RankingSkinsSection semana={semana} empreendimentoIds={empreendimentoIds} />
          <RegrasOuroCard />
        </div>

        <div className="tc" data-active={activeTab === "checklist"}>
          <CheckTab comercialName={comercialName} empreendimentoIds={empreendimentoIds} />
        </div>

        <div className="tc" data-active={activeTab === "recep"}>
          <RecepTab key={empresasKey} empreendimentosNomes={empresasNomes} />
        </div>

        <div className="tc" data-active={activeTab === "pastas"}>
          <PastasTab
            key={empresasKey}
            semNome={empresasNomes.length === 0}
            empresasNomes={empresasNomes}
            empresasCodigos={empresasCodigos}
            periodBounds={periodBounds}
            loading={pastasLoading}
            error={pastasError}
            kpis={pastasKpis}
          />
        </div>

        <div className="tc" data-active={activeTab === "arsenal"}>
          <ArsenalTab
            semana={semana}
            onSemanaChange={setSemana}
            empreendimentoIds={empreendimentoIds}
          />
        </div>

        <div className="tc" data-active={activeTab === "outbound"}>
          <OutboundTab
            semana={semana}
            onSemanaChange={setSemana}
            empreendimentoIds={empreendimentoIds}
          />
        </div>

        <div className="tc" data-active={activeTab === "imob"}>
          <ImobTab />
        </div>

        <div className="tc" data-active={activeTab === "conhecimento"}>
          <ConhecimentoTab />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import empreendimentosData from "../../../../../empreendimentos.json";
import { ArsenalTab } from "./arsenal-tab";
import { CascadeCard } from "./cascade-card";
import { CheckTab } from "./check-tab";
import { ConhecimentoTab } from "./conhecimento-tab";
import { FunnelSection } from "./funnel-section";
import { ImobTab } from "./imob-tab";
import { OutboundTab } from "./outbound-tab";
import { PastasTab } from "./pastas-tab";
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
    .replace(/[\u0300-\u036f]/g, "")
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

const STORAGE_EMPRESA = "dash.empresa";
const STORAGE_PERIODO = "dash.periodo";
const STORAGE_CUSTOM_FROM = "dash.customFrom";
const STORAGE_CUSTOM_TO = "dash.customTo";

const PERIODOS_VALIDOS: readonly PeriodoId[] = ["semana", "mes", "ultimo_mes", "custom"];

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
  const from = new Date();
  if (periodo === "semana") {
    from.setDate(today.getDate() - 6);
  } else if (periodo === "mes") {
    from.setDate(1);
  }
  return `${formatBrDate(from)} → ${formatBrDate(today)}`;
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
    from.setDate(to.getDate() - 6);
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
  const persistedFilters = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        empresa: EMPRESAS[0]?.value ?? "",
        periodo: "ultimo_mes" as PeriodoId,
        customFrom: "",
        customTo: "",
      };
    }
    try {
      const storedEmpresa = window.localStorage.getItem(STORAGE_EMPRESA);
      const empresa =
        storedEmpresa && EMPRESAS.some((e) => e.value === storedEmpresa)
          ? storedEmpresa
          : (EMPRESAS[0]?.value ?? "");
      const storedPeriodo = window.localStorage.getItem(STORAGE_PERIODO);
      const periodo =
        storedPeriodo && PERIODOS_VALIDOS.includes(storedPeriodo as PeriodoId)
          ? (storedPeriodo as PeriodoId)
          : ("ultimo_mes" as PeriodoId);
      return {
        empresa,
        periodo,
        customFrom: window.localStorage.getItem(STORAGE_CUSTOM_FROM) ?? "",
        customTo: window.localStorage.getItem(STORAGE_CUSTOM_TO) ?? "",
      };
    } catch {
      return {
        empresa: EMPRESAS[0]?.value ?? "",
        periodo: "ultimo_mes" as PeriodoId,
        customFrom: "",
        customTo: "",
      };
    }
  }, []);

  // Filters
  const [empresa, setEmpresa] = useState(persistedFilters.empresa);
  const [periodo, setPeriodo] = useState<PeriodoId>(persistedFilters.periodo);
  const [customFrom, setCustomFrom] = useState(persistedFilters.customFrom);
  const [customTo, setCustomTo] = useState(persistedFilters.customTo);
  const [comercialName, setComercialName] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_EMPRESA, empresa);
      window.localStorage.setItem(STORAGE_PERIODO, periodo);
      window.localStorage.setItem(STORAGE_CUSTOM_FROM, customFrom);
      window.localStorage.setItem(STORAGE_CUSTOM_TO, customTo);
    } catch {
      // ignore
    }
  }, [empresa, periodo, customFrom, customTo]);

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

  const empresaLabel = useMemo(
    () => EMPRESAS.find((e) => e.value === empresa)?.label ?? "",
    [empresa],
  );
  const empresaNomeSelecionado = useMemo(
    () => empreendimentoNomeFromHeaderLabel(empresaLabel),
    [empresaLabel],
  );
  // O backend do stand-check exige empreendimento_id (int64 > 0). O `empresa`
  // selecionado é o `codigo_interno_do_empreendimento` em string; a maioria
  // é numérica, mas alguns rows do JSON vêm sem código (value
  // "sem-codigo-...") — nesses casos passamos null e o CheckTab bloqueia
  // a chamada em vez de mandar payload inválido.
  const empreendimentoId = useMemo<number | null>(() => {
    if (!empresa || empresa.startsWith("sem-codigo-")) return null;
    const n = Number.parseInt(empresa, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [empresa]);
  const periodBounds = useMemo(
    () => computePeriodBounds(periodo, customFrom, customTo),
    [periodo, customFrom, customTo],
  );

  useEffect(() => {
    if (!empresaNomeSelecionado || !periodBounds) return;
    const ac = new AbortController();
    void (async () => {
      try {
        setFunnelLoading(true);
        const params = new URLSearchParams({
          codigo: empresa.startsWith("sem-codigo-") ? "" : empresa,
          nome: empresaNomeSelecionado,
          from: periodBounds.from,
          to: periodBounds.to,
        });
        const res = await fetch(`/api/dashboard/funil?${params.toString()}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          leads?: number;
          visitas?: number;
          vendas?: number;
          vendasAcumuladoHistorico?: number;
          ticketMedio?: number;
          vgvPeriodo?: number;
        };
        if (ac.signal.aborted) return;
        setReal((prev) => ({
          ...prev,
          leads: Number(data.leads ?? 0),
          visitas: Number(data.visitas ?? 0),
          vendas: Number(data.vendas ?? 0),
          vendasAcumuladoHistorico: Number(data.vendasAcumuladoHistorico ?? 0),
          // `pastas` permanece sem integração por enquanto.
          pastas: prev.pastas,
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
  }, [empresa, empresaNomeSelecionado, periodBounds]);

  useEffect(() => {
    if (!empresaNomeSelecionado) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const params = new URLSearchParams({
          codigo: empresa.startsWith("sem-codigo-") ? "" : empresa,
          nome: empresaNomeSelecionado,
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
  }, [empresa, empresaNomeSelecionado]);

  return (
    <div className="app">
      <div className="shell">
        <div className="dash-head">
          <Topbar
            empresa={empresa}
            empresaOptions={EMPRESAS}
            onEmpresaChange={setEmpresa}
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            dateRangeLabel={dateRangeLabel}
            comercialName={comercialName}
            onComercialNameChange={setComercialName}
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
          {/* <HistoricConversionCard
            key={empresa}
            codigoInterno={empresa}
            nomeSelecionado={empresaLabel}
          /> */}
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
          <RegrasOuroCard />
        </div>

        <div className="tc" data-active={activeTab === "checklist"}>
          <CheckTab comercialName={comercialName} empreendimentoId={empreendimentoId} />
        </div>

        <div className="tc" data-active={activeTab === "recep"}>
          <RecepTab empreendimentoNome={empresaNomeSelecionado} />
        </div>

        <div className="tc" data-active={activeTab === "pastas"}>
          <PastasTab />
        </div>

        <div className="tc" data-active={activeTab === "arsenal"}>
          <ArsenalTab semana={semana} onSemanaChange={setSemana} />
        </div>

        <div className="tc" data-active={activeTab === "outbound"}>
          <OutboundTab />
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

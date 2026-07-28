"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  bulkUpsertDailyTracking,
  currentWeekStartIsoMonday,
  DAILY_TRACKING_INDICATORS,
  DAILY_TRACKING_MAX_ENTERPRISES,
  describeApiError,
  getDailyTrackingWeek,
  type DailyTrackingDayIndex,
  type DailyTrackingDTO,
  type DailyTrackingIndicator,
  type DailyTrackingStatus,
  type UpsertDailyTrackingRequest,
} from "@/lib/dashboard/daily-tracking";

import { Toast, type ToastKind } from "../../_components/toast";

export type AcompanhamentoEnterprise = {
  code: string;
  name: string;
};

type Props = {
  enterprises: AcompanhamentoEnterprise[];
  semNome: boolean;
};

type RowKey = DailyTrackingIndicator;
type Status = DailyTrackingStatus;

type RowDef = {
  key: RowKey;
  label: string;
  color: string;
  bg: string;
};

type GridCell = {
  id: string | null;
  value: number;
  status: Status;
  validatedAt: string | null;
};

// Janela de 9 dias: Seg da semana (0) → Ter da semana seguinte (8).
const WEEK_DAYS = 9;
type GridRow = GridCell[];
type Grid = Record<RowKey, GridRow>;

const ROWS: readonly RowDef[] = [
  { key: "leads", label: "Leads", color: "#2563eb", bg: "#eff6ff" },
  { key: "visitas", label: "Visitas", color: "#0ea5e9", bg: "#f0f9ff" },
  { key: "pastas", label: "Pastas abertas", color: "#f59e0b", bg: "#fffbeb" },
  { key: "vendas", label: "Vendas fechadas", color: "#10b981", bg: "#ecfdf5" },
  { key: "jv", label: "Corretores JV", color: "#0f172a", bg: "#f1f5f9" },
  { key: "parc", label: "Corretores Parceria", color: "#f43f5e", bg: "#fff1f2" },
] as const;

type DayDef = { name: string; isNextWeek: boolean };
const DAY_DEFS: readonly DayDef[] = [
  { name: "Seg", isNextWeek: false },
  { name: "Ter", isNextWeek: false },
  { name: "Qua", isNextWeek: false },
  { name: "Qui", isNextWeek: false },
  { name: "Sex", isNextWeek: false },
  { name: "Sáb", isNextWeek: false },
  { name: "Dom", isNextWeek: false },
  { name: "Seg", isNextWeek: true },
  { name: "Ter", isNextWeek: true },
] as const;

function emptyCell(): GridCell {
  return { id: null, value: 0, status: "pending", validatedAt: null };
}

function emptyRow(): GridRow {
  return Array.from({ length: WEEK_DAYS }, emptyCell);
}

function emptyGrid(): Grid {
  return {
    leads: emptyRow(),
    visitas: emptyRow(),
    pastas: emptyRow(),
    vendas: emptyRow(),
    jv: emptyRow(),
    parc: emptyRow(),
  };
}

function buildGridFromItems(items: DailyTrackingDTO[]): Grid {
  const grid = emptyGrid();
  for (const it of items) {
    if (!DAILY_TRACKING_INDICATORS.includes(it.indicator)) continue;
    if (it.day_index < 0 || it.day_index > WEEK_DAYS - 1) continue;
    grid[it.indicator][it.day_index] = {
      id: it.id,
      value: Number(it.value) || 0,
      status: it.status,
      validatedAt: it.validated_at,
    };
  }
  return grid;
}

/** Filtra células de um único empreendimento (evita colisão de day_index no grid). */
function itemsForEnterprise(items: DailyTrackingDTO[], code: string): DailyTrackingDTO[] {
  return items.filter((it) => it.enterprise_code === code);
}

/**
 * Escolhe o empreendimento cujo grid alimentar a UI: o da seleção com
 * maior soma de valores (grade mais completa); senão o primeiro.
 */
function pickDisplayEnterpriseCode(preferred: string[], items: DailyTrackingDTO[]): string | null {
  if (preferred.length === 0) return null;
  let best: string | null = null;
  let bestScore = -1;
  for (const code of preferred) {
    const filtered = items.filter((it) => it.enterprise_code === code);
    if (filtered.length === 0) continue;
    const score = filtered.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return best ?? preferred[0] ?? null;
}

function formatEnterprisesLabel(enterprises: AcompanhamentoEnterprise[]): string {
  if (enterprises.length === 0) return "";
  if (enterprises.length === 1) {
    const e = enterprises[0]!;
    return e.name ? `${e.code} - ${e.name}` : e.code;
  }
  return enterprises.map((e) => (e.name ? `${e.code} - ${e.name}` : e.code)).join(" · ");
}

/** Devolve enterprise_code (string numérica) ou null se a empresa não tem id. */
function enterpriseCodeFromEmpresa(empresa: string): string | null {
  if (!empresa || empresa.startsWith("sem-id-") || empresa.startsWith("sem-codigo-")) {
    return null;
  }
  const n = Number.parseInt(empresa, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(n);
}

function resolveEnterprises(raw: AcompanhamentoEnterprise[]): AcompanhamentoEnterprise[] {
  const out: AcompanhamentoEnterprise[] = [];
  const seen = new Set<string>();
  for (const e of raw) {
    const code = enterpriseCodeFromEmpresa(e.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name: e.name.trim() });
    if (out.length >= DAILY_TRACKING_MAX_ENTERPRISES) break;
  }
  return out;
}

// ---- Helpers de data (UTC, lex-comparáveis em "YYYY-MM-DD") ----

function parseYmdUtc(ymd: string): Date | null {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysYmd(ymd: string, delta: number): string {
  const d = parseYmdUtc(ymd);
  if (!d) return ymd;
  d.setUTCDate(d.getUTCDate() + delta);
  return fmtYmdUtc(d);
}

function fmtDayMonth(ymd: string): string {
  const d = parseYmdUtc(ymd);
  if (!d) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function weekDayDates(weekStart: string): string[] {
  return Array.from({ length: WEEK_DAYS }, (_, i) => fmtDayMonth(addDaysYmd(weekStart, i)));
}

/** Índice da coluna "hoje" no grid de 9 dias, ou -1 se fora da janela. */
function todayIdxInWindow(weekStart: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const y = get("year");
  const m = get("month");
  const d = get("day");
  if (!y) return -1;
  const todayMs = Date.UTC(y, m - 1, d);
  const startMs = parseYmdUtc(weekStart)?.getTime();
  if (startMs == null) return -1;
  const diff = Math.round((todayMs - startMs) / 86_400_000);
  if (diff < 0 || diff > WEEK_DAYS - 1) return -1;
  return diff;
}

function fmtInt(n: number): string {
  return (n ?? 0).toLocaleString("pt-BR");
}

function rowTotal(row: GridRow): number {
  return row.reduce((acc, c) => acc + (c.value || 0), 0);
}

function deriveOverallStatus(grid: Grid): Status {
  let hasAny = false;
  let allValidated = true;
  let anyEditing = false;
  for (const k of DAILY_TRACKING_INDICATORS) {
    for (const cell of grid[k]) {
      if (cell.id) {
        hasAny = true;
        if (cell.status !== "validated") allValidated = false;
        if (cell.status === "editing") anyEditing = true;
      }
    }
  }
  if (hasAny && allValidated) return "validated";
  if (anyEditing) return "editing";
  return "pending";
}

function statusBadgeProps(status: Status): { label: string; tone: "pend" | "val" | "edit" } {
  if (status === "validated") return { label: "Validado", tone: "val" };
  if (status === "editing") return { label: "Em edição", tone: "edit" };
  return { label: "Pendente", tone: "pend" };
}

export function AcompanhamentoTab({ enterprises: enterprisesProp, semNome }: Props) {
  const enterprises = useMemo(() => resolveEnterprises(enterprisesProp), [enterprisesProp]);
  const enterpriseCodes = useMemo(() => enterprises.map((e) => e.code), [enterprises]);
  const enterprisesKey = enterpriseCodes.join(",");
  const empresaLabel = useMemo(() => formatEnterprisesLabel(enterprises), [enterprises]);
  const hasEnterpriseCodes = enterpriseCodes.length > 0;

  // Segunda-feira ISO da semana corrente — congelada na montagem para servir
  // de teto da navegação (não permitimos navegar para o futuro).
  const [currentWeekStart] = useState<string>(() => currentWeekStartIsoMonday());
  const [weekStart, setWeekStart] = useState<string>(currentWeekStart);

  const [grid, setGrid] = useState<Grid>(() => emptyGrid());
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  // Reset grid quando a seleção de empreendimentos muda — pattern do React
  // docs ("Resetting state when a prop changes") em vez de useEffect.
  const [lastEnterprisesKey, setLastEnterprisesKey] = useState<string>(enterprisesKey);
  if (enterprisesKey !== lastEnterprisesKey) {
    setLastEnterprisesKey(enterprisesKey);
    setGrid(emptyGrid());
    setLoading(hasEnterpriseCodes);
  }

  // Track current load to ignore stale responses (StrictMode + abort).
  const loadKeyRef = useRef<string>("");

  useEffect(() => {
    if (!hasEnterpriseCodes) return;
    const key = `${enterprisesKey}|${weekStart}`;
    loadKeyRef.current = key;
    const ac = new AbortController();
    void (async () => {
      try {
        const data = await getDailyTrackingWeek(enterpriseCodes, weekStart, ac.signal, {
          // Grade do estande (não só do usuário logado) — a recepção grava
          // e qualquer operador precisa ver/editar a mesma semana.
          shared: true,
        });
        if (loadKeyRef.current !== key) return;
        const displayCode = pickDisplayEnterpriseCode(enterpriseCodes, data.items);
        setGrid(
          displayCode
            ? buildGridFromItems(itemsForEnterprise(data.items, displayCode))
            : emptyGrid(),
        );
      } catch (err) {
        if (ac.signal.aborted) return;
        if (loadKeyRef.current !== key) return;
        setGrid(emptyGrid());
        setToast({
          kind: "error",
          message: `Falha ao carregar acompanhamento: ${describeApiError(err)}`,
        });
      } finally {
        if (loadKeyRef.current === key) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [enterpriseCodes, enterprisesKey, hasEnterpriseCodes, weekStart]);

  const today = useMemo(() => todayIdxInWindow(weekStart), [weekStart]);
  const dayDates = useMemo(() => weekDayDates(weekStart), [weekStart]);
  const overallStatus = useMemo(() => deriveOverallStatus(grid), [grid]);
  const badge = statusBadgeProps(overallStatus);

  const isCurrentWeek = weekStart === currentWeekStart;
  const canGoNext = weekStart < currentWeekStart;
  const weekRangeLabel = useMemo(
    () => `${fmtDayMonth(weekStart)} → ${fmtDayMonth(addDaysYmd(weekStart, WEEK_DAYS - 1))}`,
    [weekStart],
  );

  const changeWeek = useCallback(
    (nextWeekStart: string) => {
      if (nextWeekStart === weekStart) return;
      if (nextWeekStart > currentWeekStart) return; // bloqueia futuro
      setWeekStart(nextWeekStart);
      setGrid(emptyGrid());
      if (hasEnterpriseCodes) setLoading(true);
    },
    [weekStart, currentWeekStart, hasEnterpriseCodes],
  );

  const goPrevWeek = useCallback(() => {
    changeWeek(addDaysYmd(weekStart, -7));
  }, [changeWeek, weekStart]);

  const goNextWeek = useCallback(() => {
    changeWeek(addDaysYmd(weekStart, 7));
  }, [changeWeek, weekStart]);

  const goCurrentWeek = useCallback(() => {
    changeWeek(currentWeekStart);
  }, [changeWeek, currentWeekStart]);

  const updateCell = useCallback((row: RowKey, day: number, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setGrid((prev) => {
      const nextRow = prev[row].slice();
      const cell = nextRow[day];
      nextRow[day] = {
        ...cell,
        value: n,
        // Marca como em edição localmente — o backend mantém validated_at no
        // upsert; o badge "Em edição" volta a "Validado" depois do save.
        status: cell.status === "validated" ? "editing" : cell.status,
      };
      return { ...prev, [row]: nextRow };
    });
  }, []);

  const onSave = useCallback(() => {
    if (semNome) {
      setToast({ kind: "error", message: "Selecione um empreendimento antes de salvar." });
      return;
    }
    if (!hasEnterpriseCodes) {
      setToast({
        kind: "error",
        message: "Empreendimento sem código numérico — não é possível salvar.",
      });
      return;
    }
    void (async () => {
      setSaving(true);
      try {
        // Replica o mesmo grid para cada empreendimento selecionado (até 3).
        // O backend valida cada (week, enterprise) de forma independente.
        const items: UpsertDailyTrackingRequest[] = [];
        for (const ent of enterprises) {
          for (const indicator of DAILY_TRACKING_INDICATORS) {
            for (let dayIdx = 0; dayIdx < WEEK_DAYS; dayIdx++) {
              const cell = grid[indicator][dayIdx];
              items.push({
                week_start: weekStart,
                enterprise_code: ent.code,
                enterprise_name: ent.name || null,
                indicator,
                day_index: dayIdx as DailyTrackingDayIndex,
                value: cell.value,
              });
            }
          }
        }
        const upserted = await bulkUpsertDailyTracking(items);

        const displayCode = pickDisplayEnterpriseCode(enterpriseCodes, upserted.items);
        setGrid(
          displayCode
            ? buildGridFromItems(itemsForEnterprise(upserted.items, displayCode))
            : emptyGrid(),
        );
        const savedLabel =
          enterprises.length === 1
            ? empresaLabel || "este empreendimento"
            : `${enterprises.length} empreendimentos (${empresaLabel})`;
        setToast({
          kind: "success",
          message: `Acompanhamento salvo para ${savedLabel}.`,
        });
      } catch (err) {
        setToast({
          kind: "error",
          message: `Falha ao salvar: ${describeApiError(err)}`,
        });
      } finally {
        setSaving(false);
      }
    })();
  }, [enterprises, enterpriseCodes, empresaLabel, grid, weekStart, semNome, hasEnterpriseCodes]);

  const cellsDisabled = semNome || saving || loading || !hasEnterpriseCodes;

  return (
    <div className="acoes-tab">
      <header className="tab-hero acomp-hero">
        <div className="acomp-hero-text">
          <span className="tab-hero-eyebrow">Acompanhamento Semanal</span>
          <h1 className="tab-hero-title">
            Tracking <em>Diário</em>
          </h1>
          <p className="tab-hero-subtitle">
            {empresaLabel
              ? `${empresaLabel} · leads, visitas, pastas, vendas e corretores — Seg → Ter (9 dias)`
              : "Leads, visitas, pastas, vendas e corretores — Seg → Ter da semana seguinte (9 dias)"}
          </p>
        </div>
        <span className="acomp-status-badge" data-tone={badge.tone}>
          {badge.tone === "val" ? (
            <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden />
          ) : (
            <Pencil size={12} strokeWidth={2.5} aria-hidden />
          )}
          {badge.label}
        </span>
      </header>

      <nav className="acomp-week-nav" aria-label="Navegação de semanas">
        <button
          type="button"
          className="acomp-weeknav-btn"
          onClick={goPrevWeek}
          disabled={saving}
          aria-label="Semana anterior"
        >
          <ChevronLeft size={14} strokeWidth={2.5} aria-hidden />
          <span>Anterior</span>
        </button>

        <div className="acomp-weeknav-center">
          <CalendarClock size={14} strokeWidth={2.25} aria-hidden className="acomp-weeknav-ico" />
          <span className="acomp-weeknav-label">Semana de</span>
          <strong className="acomp-weeknav-range">{weekRangeLabel}</strong>
          {isCurrentWeek ? (
            <span className="acomp-weeknav-chip" data-tone="current">
              semana atual
            </span>
          ) : (
            <button
              type="button"
              className="acomp-weeknav-today"
              onClick={goCurrentWeek}
              disabled={saving}
            >
              ir para semana atual
            </button>
          )}
        </div>

        <button
          type="button"
          className="acomp-weeknav-btn"
          onClick={goNextWeek}
          disabled={saving || !canGoNext}
          aria-label="Próxima semana"
        >
          <span>Próxima</span>
          <ChevronRight size={14} strokeWidth={2.5} aria-hidden />
        </button>
      </nav>

      {semNome ? (
        <div className="info-banner info-banner--warn">
          <AlertTriangle size={16} strokeWidth={2} />
          <div>
            <strong>Empreendimento:</strong> selecione um ou mais empreendimentos (até{" "}
            {DAILY_TRACKING_MAX_ENTERPRISES}) no filtro superior para preencher o acompanhamento
            diário.
          </div>
        </div>
      ) : !hasEnterpriseCodes ? (
        <div className="info-banner info-banner--warn">
          <AlertTriangle size={16} strokeWidth={2} />
          <div>
            <strong>Empreendimento sem código:</strong> os empreendimentos selecionados não têm
            código numérico cadastrado. O salvamento no servidor está desabilitado.
          </div>
        </div>
      ) : null}

      <section className="acoes-card acomp-card">
        <div className="acomp-table-shell">
          <div className="acomp-table-wrap">
            <table className="acomp-table">
              <thead>
                <tr>
                  <th className="acomp-th-label">
                    <span className="acomp-th-label-eyebrow">Indicador</span>
                  </th>
                  {DAY_DEFS.map((d, i) => {
                    const isToday = i === today;
                    const classes = [
                      "acomp-th-day",
                      isToday ? "is-today" : "",
                      d.isNextWeek ? "is-next-week" : "",
                      i === 7 ? "is-next-week-start" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <th key={i} className={classes}>
                        <span className="acomp-th-day-name">{d.name}</span>
                        <span className="acomp-th-day-date">{dayDates[i]}</span>
                        {isToday ? <span className="acomp-th-today-tag">hoje</span> : null}
                        {d.isNextWeek && !isToday ? (
                          <span className="acomp-th-next-tag">próx.</span>
                        ) : null}
                      </th>
                    );
                  })}
                  <th className="acomp-th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const cells = grid[row.key];
                  return (
                    <tr key={row.key} className="acomp-tr">
                      <td
                        className="acomp-td-label"
                        style={
                          {
                            "--row-color": row.color,
                            "--row-bg": row.bg,
                          } as React.CSSProperties
                        }
                      >
                        <span className="acomp-row-dot" aria-hidden />
                        <span className="acomp-row-text">{row.label}</span>
                      </td>
                      {cells.map((cell, day) => {
                        const isToday = day === today;
                        const def = DAY_DEFS[day];
                        const className = [
                          "acomp-td-day",
                          isToday ? "is-today" : "",
                          def.isNextWeek ? "is-next-week" : "",
                          day === 7 ? "is-next-week-start" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");
                        if (semNome) {
                          return (
                            <td key={day} className={className}>
                              <span className="acomp-dash">—</span>
                            </td>
                          );
                        }
                        return (
                          <td key={day} className={className}>
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              placeholder="0"
                              value={cell.value === 0 ? "" : cell.value}
                              onChange={(e) => updateCell(row.key, day, e.target.value)}
                              disabled={cellsDisabled}
                              className="acomp-input"
                              style={
                                {
                                  "--input-color": row.color,
                                } as React.CSSProperties
                              }
                              aria-label={`${row.label} — ${def.name}${
                                def.isNextWeek ? " (próx.)" : ""
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="acomp-td-total" style={{ color: row.color }}>
                        {semNome ? "—" : fmtInt(rowTotal(cells))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="acomp-leg">
          <span className="acomp-leg-label">Legenda</span>
          <div className="acomp-leg-items">
            {ROWS.map((row) => (
              <span key={row.key} className="acomp-leg-item">
                <span className="acomp-leg-dot" style={{ background: row.color }} aria-hidden />
                {row.label}
              </span>
            ))}
          </div>
        </div>

        <div className="acomp-action-bar">
          <div className="acomp-action-buttons">
            <button
              type="button"
              className="acomp-btn acomp-btn-validate"
              onClick={onSave}
              disabled={cellsDisabled}
            >
              {saving ? (
                <Loader2 size={14} strokeWidth={2.5} aria-hidden className="acomp-spin" />
              ) : (
                <Send size={14} strokeWidth={2.5} aria-hidden />
              )}
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
          <span className="acomp-action-info">
            {semNome
              ? "Selecione um empreendimento para preencher"
              : !hasEnterpriseCodes
                ? "Empreendimento sem código — salvar indisponível"
                : loading
                  ? "Carregando dados…"
                  : enterprises.length > 1
                    ? `O mesmo grid será salvo nos ${enterprises.length} empreendimentos selecionados`
                    : "Preencha ao longo da semana e clique em Salvar quando quiser"}
          </span>
        </div>
      </section>

      {toast ? (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

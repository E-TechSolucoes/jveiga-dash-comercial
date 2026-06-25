"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  Save,
  Sparkles,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Toast, type ToastKind } from "../../_components/toast";
import { useResourceVersion } from "@/lib/dashboard/data-bus";
import {
  addWeeksToReuniaoTuesday,
  currentReuniaoTuesdayIso,
  reuniaoWeekRangeLabel,
  weeklyActionsWeekStartFromReuniao,
} from "@/lib/dashboard/reuniao-week";
import {
  type UpdateWeeklyActionInput,
  type WeeklyActionCategory,
  type WeeklyActionDTO,
  listWeeklyActions,
  updateWeeklyAction,
} from "@/lib/weekly-actions/api";

const UNIDADE_ICON: Record<string, string> = {
  leads: "📞",
  visitas: "🏠",
  pastas: "📄",
  vendas: "💰",
  corretores: "👥",
};

function parseMeta(objective: string | null): number | null {
  if (!objective) return null;
  const n = Number(objective);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function calcPPC(realizado: number | null, meta: number | null): number | null {
  if (meta === null || meta <= 0) return null;
  if (realizado === null) return null;
  return Math.round((realizado / meta) * 100);
}

type PpcCls = "green" | "amber" | "red" | "empty";
function pctCls(pct: number | null): PpcCls {
  if (pct === null) return "empty";
  if (pct >= 100) return "green";
  if (pct >= 70) return "amber";
  return "red";
}

type Props = {
  empresa: string;
  empresaLabel: string;
  semNome: boolean;
  embedded?: boolean;
};

type CategoryKey = "campo" | "treino" | "premio" | "outro";

const TAG_LABEL: Record<CategoryKey, string> = {
  campo: "Campo",
  treino: "Treino",
  premio: "Premiação",
  outro: "Outros",
};

const API_CATEGORY_TO_KEY: Record<WeeklyActionCategory, CategoryKey> = {
  field: "campo",
  training: "treino",
  award: "premio",
  other: "outro",
};

function parseEmpreendimentoId(empresa: string): number | null {
  if (!empresa) return null;
  if (empresa.startsWith("sem-id-") || empresa.startsWith("sem-codigo-")) return null;
  const n = Number.parseInt(empresa, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "—";
  }
}

function extractApiError(err: unknown): string {
  if (err && typeof err === "object") {
    const obj = err as { error?: unknown; fields?: unknown; message?: unknown };
    if (typeof obj.error === "string" && obj.error.length > 0) {
      if (obj.fields && typeof obj.fields === "object") {
        const firstField = Object.entries(obj.fields as Record<string, unknown>)[0];
        if (firstField) {
          const [name, msgs] = firstField;
          const detail = Array.isArray(msgs) && msgs.length > 0 ? String(msgs[0]) : "";
          return detail ? `${name}: ${detail}` : obj.error;
        }
      }
      return obj.error;
    }
    if (typeof obj.message === "string" && obj.message.length > 0) return obj.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Erro inesperado.";
}

function groupByCategory(items: WeeklyActionDTO[]): Record<CategoryKey, WeeklyActionDTO[]> {
  const out: Record<CategoryKey, WeeklyActionDTO[]> = {
    campo: [],
    treino: [],
    premio: [],
    outro: [],
  };
  for (const it of items) {
    const key = API_CATEGORY_TO_KEY[it.category] ?? "outro";
    out[key].push(it);
  }
  return out;
}

export function AcoesResultadosSection({
  empresa,
  empresaLabel,
  semNome,
  embedded = false,
}: Props) {
  const empreendimentoId = useMemo(() => parseEmpreendimentoId(empresa), [empresa]);
  // Teto da navegação: semana comercial atual (Ter→Seg). Congelado na montagem.
  const [maxReuniaoTuesday] = useState<string>(() => currentReuniaoTuesdayIso());
  const [reuniaoTuesday, setReuniaoTuesday] = useState<string>(maxReuniaoTuesday);
  const weekStart = useMemo(
    () => weeklyActionsWeekStartFromReuniao(reuniaoTuesday),
    [reuniaoTuesday],
  );
  const weekLabel = useMemo(() => reuniaoWeekRangeLabel(reuniaoTuesday), [reuniaoTuesday]);
  const isCurrentWeek = reuniaoTuesday === maxReuniaoTuesday;
  const canGoNext = reuniaoTuesday < maxReuniaoTuesday;

  const [items, setItems] = useState<WeeklyActionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [completedDrafts, setCompletedDrafts] = useState<Record<string, boolean>>({});
  const [motivoDrafts, setMotivoDrafts] = useState<Record<string, string>>({});
  const [realizadoBy, setRealizadoBy] = useState<Record<string, number | null>>({});
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  // Reage a mutações feitas em outras abas (ex.: criação/exclusão em
  // Ações da Semana) quando estamos olhando a mesma semana.
  const weeklyActionsVersion = useResourceVersion("weekly-actions");

  const fetchKey = empreendimentoId != null ? `${empreendimentoId}:${weekStart}` : "";
  const [trackedFetchKey, setTrackedFetchKey] = useState("");
  if (fetchKey !== trackedFetchKey) {
    setTrackedFetchKey(fetchKey);
    setItems([]);
    setError(null);
    setCompletedDrafts({});
    setMotivoDrafts({});
    setRealizadoBy({});
    setSavingIds(new Set());
    setLoading(fetchKey !== "");
  }

  const changeWeek = useCallback(
    (next: string) => {
      if (next === reuniaoTuesday) return;
      if (next > maxReuniaoTuesday) return; // bloqueia semanas futuras
      setReuniaoTuesday(next);
    },
    [reuniaoTuesday, maxReuniaoTuesday],
  );

  const goPrevWeek = useCallback(() => {
    changeWeek(addWeeksToReuniaoTuesday(reuniaoTuesday, -1));
  }, [changeWeek, reuniaoTuesday]);

  const goNextWeek = useCallback(() => {
    changeWeek(addWeeksToReuniaoTuesday(reuniaoTuesday, 1));
  }, [changeWeek, reuniaoTuesday]);

  const goCurrentWeek = useCallback(() => {
    changeWeek(maxReuniaoTuesday);
  }, [changeWeek, maxReuniaoTuesday]);

  const onRealizadoChange = useCallback((id: string, raw: string) => {
    setRealizadoBy((prev) => {
      const next = { ...prev };
      if (raw === "") {
        next[id] = null;
        return next;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return prev;
      next[id] = n;
      return next;
    });
  }, []);

  const markSaving = useCallback((id: string, on: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const applyUpdated = useCallback((updated: WeeklyActionDTO) => {
    setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setCompletedDrafts((prev) => {
      if (!(updated.id in prev)) return prev;
      const next = { ...prev };
      delete next[updated.id];
      return next;
    });
    setMotivoDrafts((prev) => {
      if (!(updated.id in prev)) return prev;
      const next = { ...prev };
      delete next[updated.id];
      return next;
    });
    setRealizadoBy((prev) => {
      if (!(updated.id in prev)) return prev;
      const next = { ...prev };
      delete next[updated.id];
      return next;
    });
  }, []);

  const onToggleCompleted = useCallback((action: WeeklyActionDTO, nextCompleted: boolean) => {
    setCompletedDrafts((prev) => ({ ...prev, [action.id]: nextCompleted }));
  }, []);

  const onMotivoDraft = useCallback((id: string, value: string) => {
    setMotivoDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const onSaveCard = useCallback(
    async (action: WeeklyActionDTO) => {
      if (savingIds.has(action.id)) return;
      const completed =
        action.id in completedDrafts ? completedDrafts[action.id] : action.completed;
      const motivoRaw =
        action.id in motivoDrafts ? motivoDrafts[action.id] : (action.non_completion_reason ?? "");
      const motivo = motivoRaw.trim();
      const achieved = action.id in realizadoBy ? realizadoBy[action.id] : action.achieved;

      const body: UpdateWeeklyActionInput = completed
        ? {
            status: "completed",
            completed: true,
            non_completion_reason: "",
          }
        : {
            status: "not_completed",
            completed: false,
            non_completion_reason: motivo,
          };
      body.achieved = achieved;

      markSaving(action.id, true);
      try {
        const updated = await updateWeeklyAction(action.id, body);
        applyUpdated(updated);
        setToast({ kind: "success", message: "Ação salva." });
      } catch (err) {
        setToast({ kind: "error", message: extractApiError(err) });
      } finally {
        markSaving(action.id, false);
      }
    },
    [savingIds, completedDrafts, motivoDrafts, realizadoBy, markSaving, applyUpdated],
  );

  useEffect(() => {
    if (empreendimentoId == null) return;
    const controller = new AbortController();
    listWeeklyActions({ empreendimentoId, weekStart }, controller.signal)
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof Error ? err.message : "Falha ao carregar os resultados das ações.";
        setError(msg);
        setItems([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [empreendimentoId, weekStart, weeklyActionsVersion]);

  const totals = useMemo(() => {
    const total = items.length;
    const porCategoria = groupByCategory(items);
    return {
      total,
      campo: porCategoria.campo.length,
      treino: porCategoria.treino.length,
      premio: porCategoria.premio.length,
      outro: porCategoria.outro.length,
    };
  }, [items]);

  return (
    <div className={`acoes-tab${embedded ? "acoes-tab--embedded" : ""}`}>
      {!embedded ? (
        <header className="tab-hero acoes-hero">
          <div className="acoes-hero-text">
            <span className="tab-hero-eyebrow">Acompanhamento Semanal</span>
            <h1 className="tab-hero-title">
              Resultados das <em>Ações</em>
            </h1>
            <p className="tab-hero-subtitle">
              {empresaLabel ? `${empresaLabel} · semana ${weekLabel}` : `Semana ${weekLabel}`}
            </p>
          </div>
          <div className="acoes-hero-aside">
            <span className="acoes-status-badge" data-tone="val">
              <History size={12} strokeWidth={2.5} aria-hidden />
              {weekLabel}
            </span>
          </div>
        </header>
      ) : null}

      {semNome ? (
        <div className="acoes-banner">
          <AlertTriangle size={16} strokeWidth={2.25} aria-hidden />
          <div>
            <strong>Empreendimento:</strong> selecione um empreendimento no filtro superior para
            acompanhar os resultados das ações da semana.
          </div>
        </div>
      ) : null}

      <div className="acoes-stats" aria-live="polite">
        <div className="acoes-stat" data-tone="blue">
          <span className="acoes-stat-label">
            <CalendarDays size={11} strokeWidth={2.5} aria-hidden /> Total registrado
          </span>
          <strong className="acoes-stat-value">
            {empreendimentoId == null ? "—" : loading ? "…" : totals.total}
          </strong>
          <span className="acoes-stat-sub">na semana {weekLabel}</span>
        </div>
        <div className="acoes-stat" data-tone="emerald">
          <span className="acoes-stat-label">
            <Target size={11} strokeWidth={2.5} aria-hidden /> Campo
          </span>
          <strong className="acoes-stat-value">
            {empreendimentoId == null ? "—" : loading ? "…" : totals.campo}
          </strong>
          <span className="acoes-stat-sub">ações de campo</span>
        </div>
        <div className="acoes-stat" data-tone="amber">
          <span className="acoes-stat-label">
            <Sparkles size={11} strokeWidth={2.5} aria-hidden /> Treino
          </span>
          <strong className="acoes-stat-value">
            {empreendimentoId == null ? "—" : loading ? "…" : totals.treino}
          </strong>
          <span className="acoes-stat-sub">treinamentos</span>
        </div>
        <div className="acoes-stat" data-tone="violet">
          <span className="acoes-stat-label">
            <Target size={11} strokeWidth={2.5} aria-hidden /> Premiação
          </span>
          <strong className="acoes-stat-value">
            {empreendimentoId == null ? "—" : loading ? "…" : totals.premio}
          </strong>
          <span className="acoes-stat-sub">premiações</span>
        </div>
      </div>

      <nav className="acomp-week-nav" aria-label="Navegação de semanas">
        <button
          type="button"
          className="acomp-weeknav-btn"
          onClick={goPrevWeek}
          aria-label="Semana anterior"
        >
          <ChevronLeft size={14} strokeWidth={2.5} aria-hidden />
          <span>Anterior</span>
        </button>

        <div className="acomp-weeknav-center">
          <CalendarClock size={14} strokeWidth={2.25} aria-hidden className="acomp-weeknav-ico" />
          <span className="acomp-weeknav-label">Semana de</span>
          <strong className="acomp-weeknav-range">{weekLabel}</strong>
          {isCurrentWeek ? (
            <span className="acomp-weeknav-chip" data-tone="current">
              semana atual
            </span>
          ) : (
            <button type="button" className="acomp-weeknav-today" onClick={goCurrentWeek}>
              ir para semana atual
            </button>
          )}
        </div>

        <button
          type="button"
          className="acomp-weeknav-btn"
          onClick={goNextWeek}
          disabled={!canGoNext}
          aria-label="Próxima semana"
          title={canGoNext ? "" : "Não é possível navegar para semanas futuras"}
        >
          <span>Próxima</span>
          <ChevronRight size={14} strokeWidth={2.5} aria-hidden />
        </button>
      </nav>

      <section className="acoes-card">
        <div className="acoes-toolbar">
          <span className="acoes-toolbar-hint">
            {empreendimentoId == null
              ? "Selecione um empreendimento"
              : loading
                ? "Carregando…"
                : `${totals.total} ${totals.total === 1 ? "ação registrada" : "ações registradas"} na semana ${weekLabel}`}
          </span>
        </div>

        <PreviousList
          items={items}
          loading={loading}
          error={error}
          semNome={semNome}
          hasEmpreendimentoId={empreendimentoId != null}
          isCurrentWeek={isCurrentWeek}
          savingIds={savingIds}
          completedDrafts={completedDrafts}
          motivoDrafts={motivoDrafts}
          realizadoBy={realizadoBy}
          onToggleCompleted={onToggleCompleted}
          onMotivoDraft={onMotivoDraft}
          onRealizadoChange={onRealizadoChange}
          onSaveCard={onSaveCard}
        />
      </section>

      {toast ? (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

function PreviousList({
  items,
  loading,
  error,
  semNome,
  hasEmpreendimentoId,
  isCurrentWeek,
  savingIds,
  completedDrafts,
  motivoDrafts,
  realizadoBy,
  onToggleCompleted,
  onMotivoDraft,
  onRealizadoChange,
  onSaveCard,
}: {
  items: WeeklyActionDTO[];
  loading: boolean;
  error: string | null;
  semNome: boolean;
  hasEmpreendimentoId: boolean;
  isCurrentWeek: boolean;
  savingIds: Set<string>;
  completedDrafts: Record<string, boolean>;
  motivoDrafts: Record<string, string>;
  realizadoBy: Record<string, number | null>;
  onToggleCompleted: (action: WeeklyActionDTO, nextCompleted: boolean) => void;
  onMotivoDraft: (id: string, value: string) => void;
  onRealizadoChange: (id: string, raw: string) => void;
  onSaveCard: (action: WeeklyActionDTO) => void;
}) {
  if (semNome || !hasEmpreendimentoId) {
    return (
      <div className="acoes-empty">
        <Sparkles size={18} strokeWidth={2} aria-hidden />
        <p>Selecione um empreendimento para acompanhar os resultados das ações</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="acoes-empty">
        <Sparkles size={18} strokeWidth={2} aria-hidden />
        <p>Carregando resultados das ações…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="acoes-empty" role="alert">
        <AlertTriangle size={18} strokeWidth={2} aria-hidden />
        <p>{error}</p>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="acoes-empty">
        <Sparkles size={18} strokeWidth={2} aria-hidden />
        <p>Nenhuma ação registrada nesta semana</p>
      </div>
    );
  }

  let totalMeta = 0;
  let totalReal = 0;
  let filledCount = 0;
  for (const a of items) {
    const m = parseMeta(a.objective);
    if (m !== null) totalMeta += m;
    const r = a.id in realizadoBy ? realizadoBy[a.id] : a.achieved;
    if (r !== null) {
      totalReal += r;
      filledCount += 1;
    }
  }
  const consolidatedPPC = totalMeta > 0 ? Math.round((totalReal / totalMeta) * 100) : null;
  const consolidatedCls = pctCls(consolidatedPPC);

  return (
    <>
      <div className="apv-summary">
        <div className="apv-summary-text">
          <div className="apv-summary-title">
            <ClipboardList size={12} strokeWidth={2.5} aria-hidden />
            {isCurrentWeek
              ? "Acompanhe os resultados da semana em andamento"
              : "Preencha os resultados da semana"}
          </div>
          <p className="apv-summary-sub">
            Para cada ação, informe se foi realizada, o realizado e o motivo quando o objetivo não
            foi atingido. Semana comercial Terça → Segunda.
          </p>
        </div>
        <div className="apv-summary-ppc">
          <span className="apv-summary-label">PPC consolidado da semana</span>
          <div className={`apv-summary-pct apv-ppc-${consolidatedCls}`}>
            {consolidatedPPC === null ? "— %" : `${consolidatedPPC}%`}
          </div>
          <span className="apv-summary-meta">
            {totalReal} / {totalMeta} total · {filledCount}/{items.length} preenchidas
          </span>
        </div>
      </div>

      <ol className="apv-list" aria-label="Resultados das ações da semana">
        {items.map((a) => {
          const cat = API_CATEGORY_TO_KEY[a.category] ?? "outro";
          const isSaving = savingIds.has(a.id);
          const completed = a.id in completedDrafts ? completedDrafts[a.id] : a.completed;
          const motivoValue =
            a.id in motivoDrafts ? motivoDrafts[a.id] : (a.non_completion_reason ?? "");
          const meta = parseMeta(a.objective);
          const realizado = a.id in realizadoBy ? realizadoBy[a.id] : a.achieved;
          const realFilled = realizado !== null;
          const ppc = calcPPC(realizado, meta);
          const ppcCls = pctCls(ppc);
          const metaAtingida = ppc !== null && ppc >= 100;
          const unitKey = a.objective_type ?? "";
          const unitIcon = unitKey ? (UNIDADE_ICON[unitKey] ?? "") : "";
          const showResult = completed && realFilled;
          const showMotivo = !completed;
          const completedDirty = a.id in completedDrafts && completedDrafts[a.id] !== a.completed;
          const motivoDirty =
            a.id in motivoDrafts && motivoDrafts[a.id] !== (a.non_completion_reason ?? "");
          const realizadoDirty = a.id in realizadoBy && realizadoBy[a.id] !== a.achieved;
          const isDirty = completedDirty || motivoDirty || realizadoDirty;
          const hasInput = completed || motivoValue.trim().length > 0 || realFilled;
          return (
            <li
              key={a.id}
              className="apv-item"
              data-cat={cat}
              data-done={completed ? "true" : "false"}
              data-dirty={isDirty ? "true" : "false"}
            >
              <div className="apv-check">
                <input
                  type="checkbox"
                  checked={completed}
                  disabled={isSaving}
                  aria-label="Ação realizada?"
                  onChange={(e) => onToggleCompleted(a, e.target.checked)}
                />
              </div>
              <div className="apv-tag" data-cat={cat}>
                <span className="apv-tag-label">{a.action_type}</span>
                <span className="apv-tag-group">{TAG_LABEL[cat]}</span>
              </div>
              <div className="apv-body">
                {a.description ? <div className="apv-desc">{a.description}</div> : null}
                <div className="apv-date">
                  <CalendarDays size={11} strokeWidth={2.25} aria-hidden />
                  {fmtDate(a.planned_date ?? a.week_start)}
                </div>
                <div className="apv-toggle-row">
                  <label className="apv-done-toggle">
                    <input
                      type="checkbox"
                      checked={completed}
                      disabled={isSaving}
                      onChange={(e) => onToggleCompleted(a, e.target.checked)}
                    />
                    <span>Ação realizada</span>
                  </label>
                  {showResult ? (
                    metaAtingida ? (
                      <span className="apv-result apv-result-ok">✓ Objetivo atingido</span>
                    ) : (
                      <span className="apv-result apv-result-miss">✕ Objetivo não atingido</span>
                    )
                  ) : null}
                  {isDirty ? (
                    <span className="apv-dirty-pill" title="Alterações não salvas">
                      alterações não salvas
                    </span>
                  ) : null}
                </div>
                {showMotivo ? (
                  <div className="apv-motivo">
                    <label htmlFor={`motivo-${a.id}`}>
                      <AlertTriangle size={11} strokeWidth={2.5} aria-hidden />
                      Por que a ação não foi realizada?{" "}
                      <span className="apv-motivo-req">(obrigatório)</span>
                    </label>
                    <input
                      id={`motivo-${a.id}`}
                      type="text"
                      value={motivoValue}
                      placeholder="Ex: Falta de equipe, cancelamento de última hora…"
                      disabled={isSaving}
                      onChange={(e) => onMotivoDraft(a.id, e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="apv-card-actions">
                  <button
                    type="button"
                    className="apv-card-save"
                    onClick={() => onSaveCard(a)}
                    disabled={isSaving || !hasInput}
                    aria-label="Salvar alterações desta ação"
                    title={
                      !hasInput ? "Marque a ação realizada, preencha o motivo ou o realizado." : ""
                    }
                  >
                    <Save size={13} strokeWidth={2.5} aria-hidden />
                    {isSaving ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
              <div className="apv-col apv-col-meta">
                <span className="apv-label">
                  <Target size={10} strokeWidth={2.5} aria-hidden /> Meta
                </span>
                <div className="apv-meta-big">{meta !== null ? meta : "—"}</div>
                <span className="apv-unit-line">
                  {unitIcon ? <span aria-hidden>{unitIcon}</span> : null}
                  {unitKey || ""}
                </span>
              </div>
              <div className="apv-col apv-col-real">
                <div className="apv-block">
                  <span className="apv-label">✅ Realizado</span>
                  <div className="apv-real-wrap">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className={`apv-real-input ${realFilled ? "" : "is-empty"}`}
                      value={realFilled ? String(realizado) : ""}
                      placeholder="—"
                      onChange={(e) => onRealizadoChange(a.id, e.target.value)}
                    />
                    <span className="apv-real-unit">
                      {unitIcon ? <span aria-hidden>{unitIcon}</span> : null}
                      {unitKey || ""}
                    </span>
                  </div>
                </div>
                <div className="apv-block">
                  <span className="apv-label">📊 PPC</span>
                  <div className={`apv-ppc apv-ppc-${ppcCls}`}>
                    {ppc === null ? "aguardando" : `${ppc}%`}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

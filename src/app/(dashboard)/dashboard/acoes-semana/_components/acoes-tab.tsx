"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Toast, type ToastKind } from "../../_components/toast";
import { useResourceVersion } from "@/lib/dashboard/data-bus";
import {
  addWeeksToReuniaoTuesday,
  currentReuniaoTuesdayIso,
  getReuniaoWeekBounds,
  plannedDateWithinReuniaoWeek,
  reuniaoWeekRangeLabel,
  weeklyActionsWeekStartFromReuniao,
} from "@/lib/dashboard/reuniao-week";
import {
  type CreateWeeklyActionInput,
  type ObjectiveUnit,
  OBJECTIVE_UNITS,
  type WeeklyActionDTO,
  createWeeklyAction,
  deleteWeeklyAction,
  listWeeklyActions,
} from "@/lib/weekly-actions/api";
import {
  API_CATEGORY_TO_UI,
  UI_CATEGORY_TO_API,
  WEEKLY_ACTION_CATEGORIES,
  categoryOfActionType,
  type WeeklyActionCategoryKey,
} from "@/lib/weekly-actions/catalog";

type Props = {
  empresa: string;
  empresaLabel: string;
  semNome: boolean;
  embedded?: boolean;
};

const TAG_LABEL: Record<WeeklyActionCategoryKey, string> = {
  campo: "Campo",
  treino: "Treino",
  premio: "Premiação",
  outro: "Outros",
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

function fmtIndex(n: number): string {
  return String(n).padStart(2, "0");
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

export function AcoesTab({ empresa, empresaLabel, semNome, embedded = false }: Props) {
  const empreendimentoId = useMemo(() => parseEmpreendimentoId(empresa), [empresa]);
  // Teto da navegação: semana comercial atual (Ter→Seg). Congelado na montagem.
  const [maxReuniaoTuesday] = useState<string>(() => currentReuniaoTuesdayIso());
  const [reuniaoTuesday, setReuniaoTuesday] = useState<string>(maxReuniaoTuesday);
  const weekStart = useMemo(
    () => weeklyActionsWeekStartFromReuniao(reuniaoTuesday),
    [reuniaoTuesday],
  );
  const weekLabel = useMemo(() => reuniaoWeekRangeLabel(reuniaoTuesday), [reuniaoTuesday]);
  const reuniaoBounds = useMemo(() => getReuniaoWeekBounds(reuniaoTuesday), [reuniaoTuesday]);
  const isCurrentWeek = reuniaoTuesday === maxReuniaoTuesday;
  const canGoNext = reuniaoTuesday < maxReuniaoTuesday;

  const [items, setItems] = useState<WeeklyActionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Reage a mutações feitas em outras abas (ex.: marcar concluído em
  // Resultados das Ações) na mesma semana.
  const weeklyActionsVersion = useResourceVersion("weekly-actions");

  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [formTag, setFormTag] = useState<string>(WEEKLY_ACTION_CATEGORIES[0].options[0]);
  const [formDate, setFormDate] = useState<string>("");
  const [formObjetivo, setFormObjetivo] = useState<string>("");
  const [formUnidade, setFormUnidade] = useState<ObjectiveUnit>("leads");
  const [formText, setFormText] = useState<string>("");

  const fetchKey = empreendimentoId != null ? `${empreendimentoId}:${weekStart}` : "";
  const [trackedFetchKey, setTrackedFetchKey] = useState("");
  if (fetchKey !== trackedFetchKey) {
    setTrackedFetchKey(fetchKey);
    setItems([]);
    setLoadError(null);
    setLoading(fetchKey !== "");
  }

  const changeWeek = useCallback(
    (next: string) => {
      if (next === reuniaoTuesday) return;
      if (next > maxReuniaoTuesday) return; // bloqueia futuro
      setReuniaoTuesday(next);
      // Reseta a data planejada: a anterior pode estar fora da nova semana.
      setFormDate("");
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
        setLoadError(extractApiError(err));
        setItems([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [empreendimentoId, weekStart, weeklyActionsVersion]);

  const totals = useMemo(() => {
    const total = items.length;
    let campo = 0;
    let treino = 0;
    let premio = 0;
    for (const it of items) {
      const key = API_CATEGORY_TO_UI[it.category] ?? "outro";
      if (key === "campo") campo += 1;
      else if (key === "treino") treino += 1;
      else if (key === "premio") premio += 1;
    }
    return { total, campo, treino, premio };
  }, [items]);

  const onAdd = useCallback(async () => {
    if (semNome || empreendimentoId == null) {
      setToast({ kind: "error", message: "Selecione um empreendimento antes de adicionar." });
      return;
    }
    const text = formText.trim();
    if (!text) {
      setToast({ kind: "error", message: "Preencha a descrição da ação." });
      return;
    }
    if (formDate && !plannedDateWithinReuniaoWeek(formDate, reuniaoTuesday)) {
      setToast({
        kind: "error",
        message: `A data planejada deve estar dentro da semana ${weekLabel}.`,
      });
      return;
    }

    const cat = categoryOfActionType(formTag);
    const body: CreateWeeklyActionInput = {
      empreendimento_id: empreendimentoId,
      week_start: weekStart,
      category: UI_CATEGORY_TO_API[cat],
      action_type: formTag,
      description: text,
    };
    if (formDate) body.planned_date = formDate;
    const obj = formObjetivo.trim();
    if (obj) {
      body.objective = obj;
      body.objective_type = formUnidade;
    }

    setCreating(true);
    try {
      const created = await createWeeklyAction(body);
      setItems((prev) => [...prev, created]);
      setFormText("");
      setFormObjetivo("");
      setFormUnidade("leads");
      setFormDate("");
      setToast({ kind: "success", message: "Ação adicionada." });
    } catch (err) {
      setToast({ kind: "error", message: extractApiError(err) });
    } finally {
      setCreating(false);
    }
  }, [
    semNome,
    empreendimentoId,
    formText,
    formDate,
    formObjetivo,
    formUnidade,
    formTag,
    reuniaoTuesday,
    weekStart,
    weekLabel,
  ]);

  const onRemove = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWeeklyAction(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      setToast({ kind: "success", message: "Ação removida." });
    } catch (err) {
      setToast({ kind: "error", message: extractApiError(err) });
    } finally {
      setDeletingId(null);
    }
  }, []);

  const formDisabled = semNome || empreendimentoId == null;

  return (
    <div className={`acoes-tab${embedded ? "acoes-tab--embedded" : ""}`}>
      {!embedded ? (
        <header className="tab-hero acoes-hero">
          <div className="acoes-hero-text">
            <span className="tab-hero-eyebrow">Planejamento Semanal</span>
            <h1 className="tab-hero-title">
              Ações da <em>Semana</em>
            </h1>
            <p className="tab-hero-subtitle">
              {empresaLabel ? `${empresaLabel} · ${weekLabel}` : `Semana ${weekLabel}`}
            </p>
          </div>
          <div className="acoes-hero-aside">
            <span className="acoes-status-badge" data-tone="edit">
              <CalendarDays size={12} strokeWidth={2.5} aria-hidden />
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
            cadastrar ações da semana.
          </div>
        </div>
      ) : null}

      <div className="acoes-stats" aria-live="polite">
        <div className="acoes-stat" data-tone="blue">
          <span className="acoes-stat-label">
            <ListChecks size={11} strokeWidth={2.5} aria-hidden /> Ações cadastradas
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
        <div className="acoes-form">
          <div className="acoes-form-head">
            <span className="acoes-form-eyebrow">Nova ação</span>
            <span className="acoes-form-hint">
              Pressione <kbd>Enter</kbd> na descrição para adicionar
            </span>
          </div>
          <div className="acoes-form-grid">
            <div className="acoes-field">
              <label htmlFor="acao-tag">Tipo de ação</label>
              <select
                id="acao-tag"
                value={formTag}
                onChange={(e) => setFormTag(e.target.value)}
                disabled={formDisabled || creating}
              >
                {WEEKLY_ACTION_CATEGORIES.map((cat) => (
                  <optgroup key={cat.key} label={`── ${cat.label} ──`}>
                    {cat.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="acoes-field">
              <label htmlFor="acao-date">Data</label>
              <input
                id="acao-date"
                type="date"
                value={formDate}
                min={reuniaoBounds.from}
                max={reuniaoBounds.fullEnd}
                onChange={(e) => setFormDate(e.target.value)}
                disabled={formDisabled || creating}
              />
            </div>
            <div className="acoes-field">
              <label htmlFor="acao-objetivo">Objetivo</label>
              <div className="acoes-objetivo-group">
                <input
                  id="acao-objetivo"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={formObjetivo}
                  onChange={(e) => setFormObjetivo(e.target.value)}
                  placeholder="Ex: 30"
                  disabled={formDisabled || creating}
                />
                <select
                  id="acao-unidade"
                  aria-label="Unidade do objetivo"
                  value={formUnidade}
                  onChange={(e) => setFormUnidade(e.target.value as ObjectiveUnit)}
                  disabled={formDisabled || creating}
                >
                  {OBJECTIVE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="acoes-field acoes-field-span2">
              <label htmlFor="acao-text">Descrição da ação</label>
              <input
                id="acao-text"
                type="text"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Ex: Captação no Shopping Vila Olímpia com 3 promotoras…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) {
                    e.preventDefault();
                    void onAdd();
                  }
                }}
                disabled={formDisabled || creating}
              />
            </div>
            <div className="acoes-field acoes-field-add">
              <button
                type="button"
                className="acoes-btn acoes-btn-add"
                onClick={() => void onAdd()}
                disabled={formDisabled || creating}
              >
                <Plus size={14} strokeWidth={2.5} aria-hidden />
                {creating ? "Adicionando…" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>

        <ActionsList
          items={items}
          loading={loading}
          error={loadError}
          semNome={semNome}
          hasEmpreendimentoId={empreendimentoId != null}
          deletingId={deletingId}
          onRemove={onRemove}
        />
      </section>

      {toast ? (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

function ActionsList({
  items,
  loading,
  error,
  semNome,
  hasEmpreendimentoId,
  deletingId,
  onRemove,
}: {
  items: WeeklyActionDTO[];
  loading: boolean;
  error: string | null;
  semNome: boolean;
  hasEmpreendimentoId: boolean;
  deletingId: string | null;
  onRemove: (id: string) => void;
}) {
  if (semNome || !hasEmpreendimentoId) {
    return (
      <div className="acoes-empty">
        <Sparkles size={18} strokeWidth={2} aria-hidden />
        <p>Selecione um empreendimento para gerenciar ações da semana</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="acoes-empty">
        <Sparkles size={18} strokeWidth={2} aria-hidden />
        <p>Carregando ações da semana…</p>
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
        <p>Nenhuma ação cadastrada — use o formulário acima para começar</p>
      </div>
    );
  }
  return (
    <ol className="acoes-list" aria-label="Ações da semana atual">
      {items.map((a, idx) => {
        const cat = API_CATEGORY_TO_UI[a.category] ?? "outro";
        const isDeleting = deletingId === a.id;
        return (
          <li key={a.id} className="acoes-item" data-cat={cat}>
            <div className="acoes-rail" aria-hidden>
              <span className="acoes-rail-cat">{TAG_LABEL[cat]}</span>
            </div>
            <div className="acoes-index" aria-hidden>
              <span className="acoes-index-hash">#</span>
              <span className="acoes-index-num">{fmtIndex(idx + 1)}</span>
            </div>
            <div className="acoes-body">
              <div className="acoes-body-head">
                <span className="acoes-tag-pill" data-cat={cat}>
                  {a.action_type}
                </span>
                <span className="acoes-meta-date">
                  <CalendarDays size={11} strokeWidth={2.25} aria-hidden />
                  {fmtDate(a.planned_date ?? a.week_start)}
                </span>
              </div>
              {a.description ? <p className="acoes-desc">{a.description}</p> : null}
              {a.objective ? (
                <p className="acoes-obj">
                  <Target size={11} strokeWidth={2.5} aria-hidden />
                  <span>
                    {a.objective}
                    {a.objective_type ? ` ${a.objective_type}` : ""}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="acoes-side">
              <button
                type="button"
                className="acoes-del"
                onClick={() => onRemove(a.id)}
                disabled={isDeleting}
                aria-label={`Remover ação: ${a.action_type}`}
                title={isDeleting ? "Removendo…" : "Remover"}
              >
                <Trash2 size={13} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

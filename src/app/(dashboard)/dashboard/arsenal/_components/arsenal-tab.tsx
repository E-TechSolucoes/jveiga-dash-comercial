"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  ListChecks,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  useAddBrokerToWeek,
  useArsenalWeek,
  useCreateFieldBroker,
  usePatchFieldBroker,
  usePutBrokerStats,
  useRemoveBrokerFromWeek,
} from "@/hooks/use-arsenal";
import { useAgencies, useAgencyFieldBrokers } from "@/hooks/use-imob";
import {
  isApiError,
  isoWeekNumber,
  weekStartFromSemana,
  type ArsenalBroker,
} from "@/lib/arsenal/api";
import {
  recordBrokerScoresForParticipants,
  removeBrokerScoresForParticipants,
} from "@/lib/broker-scores/api";
import { bumpResource, useResourceVersion } from "@/lib/dashboard/data-bus";
import type { RealEstateAgency } from "@/lib/imob/api";
import {
  OBJECTIVE_UNITS,
  createWeeklyAction,
  listWeeklyActions,
  unvalidateWeeklyAction,
  updateWeeklyAction,
  validateWeeklyAction,
  type CreateWeeklyActionInput,
  type ObjectiveUnit,
  type UpdateWeeklyActionInput,
  type WeeklyActionDTO,
} from "@/lib/weekly-actions/api";
import {
  API_CATEGORY_TO_UI,
  UI_CATEGORY_TO_API,
  WEEKLY_ACTION_CATEGORIES,
  categoryOfActionType,
  scoreSlugForActionType,
} from "@/lib/weekly-actions/catalog";

import { PONTOS } from "../../_components/arsenal-data";
import { Toast, type ToastKind } from "../../_components/toast";

const TOAST_DURATION_MS = 3000;

type StatField = "ind" | "vis" | "pas" | "pas_aprov" | "vendas";

type StatDraft = Partial<Record<StatField, number>>;

function toBrDateRange(weekStart: string, weekEnd: string): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  return `${fmt(weekStart)} — ${fmt(weekEnd)}`;
}

function weekdayFromPlannedDate(weekStart: string, plannedDate: string): number {
  const [wy, wm, wd] = weekStart.split("-").map(Number);
  const [py, pm, pd] = plannedDate.split("-").map(Number);
  const start = Date.UTC(wy, wm - 1, wd);
  const planned = Date.UTC(py, pm - 1, pd);
  const diff = Math.round((planned - start) / 86400000);
  return Math.min(6, Math.max(1, diff + 1));
}

function errorMessage(err: unknown): string {
  if (isApiError(err)) return err.error;
  if (err instanceof Error) return err.message;
  return "Falha na operação.";
}

type Props = {
  semana: number;
  onSemanaChange: (next: number) => void;
  empreendimentoIds: number[];
};

export function ArsenalTab({ semana, onSemanaChange, empreendimentoIds }: Props) {
  // Backend single-id: usa o primeiro empreendimento selecionado.
  const empreendimentoId = empreendimentoIds[0] ?? null;

  const [novoNome, setNovoNome] = useState("");
  const [novaImob, setNovaImob] = useState(""); // agency id (uuid) or "" for none
  const [novoCel, setNovoCel] = useState("");

  const [statDrafts, setStatDrafts] = useState<Record<string, StatDraft>>({});
  const [pendingSlot, setPendingSlot] = useState<Record<string, boolean>>({});
  const [pendingBroker, setPendingBroker] = useState<Record<string, boolean>>({});
  const [weeklyActions, setWeeklyActions] = useState<WeeklyActionDTO[]>([]);
  const [weeklyActionsLoading, setWeeklyActionsLoading] = useState(false);
  const [weeklyActionsError, setWeeklyActionsError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ kind: ToastKind; message: string; key: number } | null>(
    null,
  );

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = (kind: ToastKind, message: string) =>
    setToast({ kind, message, key: Date.now() });

  // Defer weekStart computation to client mount: it depends on Date.now() in BR
  // timezone, so SSR and the first client render would otherwise diverge.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const weekStart = useMemo(
    () => (mounted ? weekStartFromSemana(semana) : null),
    [mounted, semana],
  );

  const weekQuery = useArsenalWeek(weekStart ?? "", empreendimentoId);
  const week = weekQuery.data ?? null;
  const loading = !mounted || weekQuery.isLoading;
  const error = weekQuery.isError ? errorMessage(weekQuery.error) : null;
  const weeklyActionsVersion = useResourceVersion("weekly-actions");

  const agenciesQuery = useAgencies();
  const agencies = agenciesQuery.data ?? [];

  const createBrokerMutation = useCreateFieldBroker();
  const patchBrokerMutation = usePatchFieldBroker();
  const addToWeekMutation = useAddBrokerToWeek();
  const removeFromWeekMutation = useRemoveBrokerFromWeek();
  const brokerStatsMutation = usePutBrokerStats();

  const apiBrokers: ArsenalBroker[] = week?.brokers ?? [];

  const validations = weeklyActions.filter((a) => Boolean(a.validated_at)).length;

  useEffect(() => {
    if (!weekStart || !empreendimentoId) {
      return;
    }
    const controller = new AbortController();
    listWeeklyActions({ empreendimentoId, weekStart }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setWeeklyActions(data);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setWeeklyActions([]);
        setWeeklyActionsError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setWeeklyActionsLoading(false);
      });
    return () => controller.abort();
  }, [empreendimentoId, weekStart, weeklyActionsVersion]);

  // Cadastra um corretor novo no cadastro global e já o adiciona à semana.
  const addCorretor = async () => {
    const nome = novoNome.trim();
    if (!nome) {
      showToast("error", "Informe o nome do corretor.");
      return;
    }
    if (!empreendimentoId) {
      showToast("error", "Selecione um empreendimento no topo antes de cadastrar.");
      return;
    }
    if (!weekStart) {
      showToast("error", "Semana não inicializada.");
      return;
    }
    try {
      const created = await createBrokerMutation.mutateAsync({
        nome,
        real_estate_agency_id: novaImob || null,
        celular: novoCel.trim() || undefined,
      });
      await addToWeekMutation.mutateAsync({
        field_broker_id: created.id,
        empreendimento_id: empreendimentoId,
        week_start: weekStart,
      });
      setNovoNome("");
      setNovaImob("");
      setNovoCel("");
      showToast("success", `Corretor ${nome} cadastrado e adicionado à semana.`);
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    }
  };

  // Adiciona um corretor já existente no cadastro global à semana atual.
  const addExistingBroker = async (brokerId: string): Promise<boolean> => {
    if (!empreendimentoId || !weekStart) {
      showToast("error", "Selecione um empreendimento no topo antes de adicionar.");
      return false;
    }
    try {
      await addToWeekMutation.mutateAsync({
        field_broker_id: brokerId,
        empreendimento_id: empreendimentoId,
        week_start: weekStart,
      });
      showToast("success", "Corretor adicionado à semana.");
      return true;
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
      return false;
    }
  };

  const [editingBroker, setEditingBroker] = useState<ArsenalBroker | null>(null);
  const [formTag, setFormTag] = useState<string>(WEEKLY_ACTION_CATEGORIES[0].options[0]);
  const [formDate, setFormDate] = useState<string>("");
  const [formObjetivo, setFormObjetivo] = useState<string>("");
  const [formUnidade, setFormUnidade] = useState<ObjectiveUnit>("leads");
  const [formText, setFormText] = useState<string>("");
  const [creatingWeeklyAction, setCreatingWeeklyAction] = useState(false);
  const [editingAction, setEditingAction] = useState<WeeklyActionDTO | null>(null);
  const [savingResultId, setSavingResultId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const saveBrokerEdit = async (
    broker: ArsenalBroker,
    next: { real_estate_agency_id: string | null; celular: string | null },
  ) => {
    setPendingBroker((prev) => ({ ...prev, [broker.broker_id]: true }));
    try {
      await patchBrokerMutation.mutateAsync({ id: broker.broker_id, payload: next });
      setEditingBroker(null);
      showToast("success", `Corretor ${broker.nome} atualizado.`);
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setPendingBroker((prev) => {
        const copy = { ...prev };
        delete copy[broker.broker_id];
        return copy;
      });
    }
  };

  const removeCorretor = async (broker: ArsenalBroker) => {
    if (!window.confirm(`Remover ${broker.nome} desta semana?`)) return;
    setPendingBroker((prev) => ({ ...prev, [broker.broker_id]: true }));
    try {
      await removeFromWeekMutation.mutateAsync(broker.weekly_id);
      showToast("success", `Corretor ${broker.nome} removido da semana.`);
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setPendingBroker((prev) => {
        const next = { ...prev };
        delete next[broker.broker_id];
        return next;
      });
    }
  };

  const setStatDraft = (brokerId: string, field: StatField, value: number) => {
    setStatDrafts((prev) => ({
      ...prev,
      [brokerId]: { ...prev[brokerId], [field]: Math.max(0, value) },
    }));
  };

  const flushBrokerStats = async (broker: ArsenalBroker) => {
    const draft = statDrafts[broker.broker_id];
    if (!draft || !weekStart || !empreendimentoId) return;
    const payload = {
      empreendimento_id: empreendimentoId,
      week_start: weekStart,
      ind: draft.ind ?? broker.ind,
      vis: draft.vis ?? broker.vis,
      pas: draft.pas ?? broker.pas,
      pas_aprov: draft.pas_aprov ?? broker.pas_aprov,
      vendas: draft.vendas ?? broker.vendas,
    };
    setPendingBroker((prev) => ({ ...prev, [broker.broker_id]: true }));
    try {
      await brokerStatsMutation.mutateAsync({ brokerId: broker.broker_id, payload });
      setStatDrafts((prev) => {
        const next = { ...prev };
        delete next[broker.broker_id];
        return next;
      });
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setPendingBroker((prev) => {
        const next = { ...prev };
        delete next[broker.broker_id];
        return next;
      });
    }
  };

  // ============= AÇÕES OFFLINE (weekly_actions) =============

  const createOfflineAction = async () => {
    if (!weekStart || !empreendimentoId) {
      showToast("error", "Selecione um empreendimento no topo antes de cadastrar.");
      return;
    }
    const text = formText.trim();
    if (!text) {
      showToast("error", "Preencha a descrição da ação.");
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
    const objective = formObjetivo.trim();
    if (objective) {
      body.objective = objective;
      body.objective_type = formUnidade;
    }
    setCreatingWeeklyAction(true);
    try {
      const created = await createWeeklyAction(body);
      setWeeklyActions((prev) => [...prev, created]);
      setFormText("");
      setFormObjetivo("");
      setFormUnidade("leads");
      setFormDate("");
      showToast("success", "Ação cadastrada em Ações da Semana.");
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setCreatingWeeklyAction(false);
    }
  };

  const validateSlot = async (
    action: WeeklyActionDTO,
    draft: { local: string; participantIds: string[] },
  ): Promise<boolean> => {
    if (!weekStart || !empreendimentoId) return false;
    const slot = action.id;
    setPendingSlot((prev) => ({ ...prev, [slot]: true }));
    try {
      const updated = await validateWeeklyAction(action.id, {
        local: draft.local.trim() || undefined,
        participant_broker_ids: draft.participantIds,
      });
      setWeeklyActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

      if (action.planned_date) {
        const weekday = weekdayFromPlannedDate(weekStart, action.planned_date);
        await recordBrokerScoresForParticipants({
          actionSlug: scoreSlugForActionType(action.action_type),
          weekStart,
          weekday,
          empreendimentoId,
          participantIds: draft.participantIds,
        });
      }
      bumpResource("weekly-actions");
      showToast("success", `${action.action_type} validada!`);
      return true;
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
      return false;
    } finally {
      setPendingSlot((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };

  const undoAcao = async (action: WeeklyActionDTO) => {
    const slot = `unvalidate__${action.id}`;
    setPendingSlot((prev) => ({ ...prev, [slot]: true }));
    try {
      const updated = await unvalidateWeeklyAction(action.id);
      setWeeklyActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

      if (action.planned_date && weekStart && empreendimentoId) {
        const weekday = weekdayFromPlannedDate(weekStart, action.planned_date);
        await removeBrokerScoresForParticipants({
          actionSlug: scoreSlugForActionType(action.action_type),
          weekStart,
          weekday,
          empreendimentoId,
          participantIds: (action.participants ?? []).map((p) => p.broker_id),
        });
      }
      bumpResource("weekly-actions");
      showToast("success", "Validação desfeita.");
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setPendingSlot((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };

  const patchWeeklyActionInList = (updated: WeeklyActionDTO) => {
    setWeeklyActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    bumpResource("weekly-actions");
  };

  const saveActionEdit = async (
    action: WeeklyActionDTO,
    draft: {
      actionType: string;
      plannedDate: string;
      objective: string;
      unit: ObjectiveUnit;
      description: string;
    },
  ) => {
    const description = draft.description.trim();
    if (!description) {
      showToast("error", "Preencha a descrição da ação.");
      return;
    }
    const cat = categoryOfActionType(draft.actionType);
    const objective = draft.objective.trim();
    const body: UpdateWeeklyActionInput = {
      category: UI_CATEGORY_TO_API[cat],
      action_type: draft.actionType,
      description,
      planned_date: draft.plannedDate || "",
      objective: objective || "",
      objective_type: objective ? draft.unit : "",
    };
    setSavingEditId(action.id);
    try {
      const updated = await updateWeeklyAction(action.id, body);
      patchWeeklyActionInList(updated);
      setEditingAction(null);
      showToast("success", "Ação atualizada.");
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setSavingEditId(null);
    }
  };

  const saveActionResult = async (
    action: WeeklyActionDTO,
    draft: { achieved: number | null; completed: boolean; motivo: string },
  ) => {
    if (!draft.completed && !draft.motivo.trim()) {
      showToast("error", "Informe o motivo quando a ação não foi realizada.");
      return false;
    }
    const body: UpdateWeeklyActionInput = draft.completed
      ? {
          status: "completed",
          completed: true,
          non_completion_reason: "",
          achieved: draft.achieved,
        }
      : {
          status: "not_completed",
          completed: false,
          non_completion_reason: draft.motivo.trim(),
          achieved: draft.achieved,
        };
    setSavingResultId(action.id);
    try {
      const updated = await updateWeeklyAction(action.id, body);
      patchWeeklyActionInList(updated);
      showToast("success", "Resultado salvo.");
      return true;
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
      return false;
    } finally {
      setSavingResultId(null);
    }
  };

  // ============= RENDER =============

  return (
    <>
      <div className="info-banner">
        <Info size={16} strokeWidth={2} />
        <div>
          Cadastre os <strong>corretores</strong> que executaram cada arma no dia, registre o
          <strong> local</strong> (em ações de campo) e <strong>valide</strong> para gerar
          accountability — cada validação rende pontos e desbloqueia skins.
        </div>
      </div>

      {error && (
        <div className="info-banner" data-state="error">
          <Info size={16} strokeWidth={2} />
          <div>{error}</div>
        </div>
      )}

      <SemNav
        loading={loading || !weekStart}
        semana={semana}
        weekNumber={week?.week_number ?? (weekStart ? isoWeekNumber(weekStart) : null)}
        weekStart={week?.week_start ?? weekStart ?? ""}
        weekEnd={week?.week_end ?? null}
        validations={validations}
        onSemanaChange={onSemanaChange}
      />

      <BrokersCard
        loading={loading}
        brokers={apiBrokers}
        agencies={agencies}
        statDrafts={statDrafts}
        pendingBroker={pendingBroker}
        novoNome={novoNome}
        novaImob={novaImob}
        novoCel={novoCel}
        creating={createBrokerMutation.isPending || addToWeekMutation.isPending}
        addingToWeek={addToWeekMutation.isPending}
        onNomeChange={setNovoNome}
        onImobChange={setNovaImob}
        onCelChange={setNovoCel}
        onAdd={addCorretor}
        onAddBroker={addExistingBroker}
        onSetStatDraft={setStatDraft}
        onFlushStats={flushBrokerStats}
        onRemove={removeCorretor}
        onEdit={(broker) => setEditingBroker(broker)}
      />

      {editingBroker && (
        <BrokerEditDialog
          broker={editingBroker}
          agencies={agencies}
          pending={!!pendingBroker[editingBroker.broker_id]}
          onCancel={() => setEditingBroker(null)}
          onSave={saveBrokerEdit}
        />
      )}

      <section className="acoes-card offline-week-card">
        <OfflineActionCreateForm
          formTag={formTag}
          formDate={formDate}
          formObjetivo={formObjetivo}
          formUnidade={formUnidade}
          formText={formText}
          disabled={!empreendimentoId || !weekStart || creatingWeeklyAction}
          creating={creatingWeeklyAction}
          onTagChange={setFormTag}
          onDateChange={setFormDate}
          onObjetivoChange={setFormObjetivo}
          onUnidadeChange={setFormUnidade}
          onTextChange={setFormText}
          onAdd={createOfflineAction}
        />

        <div className="offline-actions-list-wrap">
          {weeklyActionsError && (
            <div className="info-banner" data-state="error" style={{ marginBottom: 14 }}>
              <Info size={16} strokeWidth={2} />
              <div>{weeklyActionsError}</div>
            </div>
          )}
          <div className="offline-actions-list-head">
            <h3>Ações cadastradas</h3>
            <span>
              {weeklyActionsLoading ? "Carregando…" : `${weeklyActions.length} nesta semana`}
            </span>
          </div>
          <AcaoList
            loading={weeklyActionsLoading}
            actions={weeklyActions}
            brokers={apiBrokers}
            pendingSlot={pendingSlot}
            savingResultId={savingResultId}
            onValidateSlot={validateSlot}
            onUndo={undoAcao}
            onEdit={setEditingAction}
            onSaveResult={saveActionResult}
            emptyLabel="Nenhuma ação cadastrada nesta semana — use o formulário acima."
          />
        </div>
      </section>

      {editingAction && (
        <ActionEditDialog
          action={editingAction}
          pending={savingEditId === editingAction.id}
          onCancel={() => setEditingAction(null)}
          onSave={saveActionEdit}
        />
      )}

      {toast && (
        <Toast
          key={toast.key}
          kind={toast.kind}
          message={toast.message}
          durationMs={TOAST_DURATION_MS}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

// ============= BROKERS CARD =============

type BrokersCardProps = {
  loading: boolean;
  brokers: ArsenalBroker[];
  agencies: RealEstateAgency[];
  statDrafts: Record<string, StatDraft>;
  pendingBroker: Record<string, boolean>;
  novoNome: string;
  novaImob: string;
  novoCel: string;
  creating: boolean;
  addingToWeek: boolean;
  onNomeChange: (value: string) => void;
  onImobChange: (value: string) => void;
  onCelChange: (value: string) => void;
  onAdd: () => void;
  onAddBroker: (brokerId: string) => Promise<boolean>;
  onSetStatDraft: (brokerId: string, field: StatField, value: number) => void;
  onFlushStats: (broker: ArsenalBroker) => void;
  onRemove: (broker: ArsenalBroker) => void;
  onEdit: (broker: ArsenalBroker) => void;
};

function BrokersCard({
  loading,
  brokers,
  agencies,
  statDrafts,
  pendingBroker,
  novoNome,
  novaImob,
  novoCel,
  creating,
  addingToWeek,
  onNomeChange,
  onImobChange,
  onCelChange,
  onAdd,
  onAddBroker,
  onSetStatDraft,
  onFlushStats,
  onRemove,
  onEdit,
}: BrokersCardProps) {
  return (
    <section className="data-card">
      <header className="data-card-head">
        <div>
          <h2 className="data-card-title">
            <Users size={18} strokeWidth={2} /> Corretores — Cadastro &amp; Performance
          </h2>
          <p className="data-card-sub">
            Pontuação calculada no servidor: indicações × {PONTOS.indicacao} · visitas ×{" "}
            {PONTOS.visita} · pastas × {PONTOS.pasta} · pastas aprovadas × {PONTOS.pastaAprov} ·
            vendas × {PONTOS.venda}. Ações da semana contam {PONTOS.acao} pts cada (≥{" "}
            {PONTOS.acaoBonusMin} ações ganham bônus de {PONTOS.acaoBonus}).
          </p>
        </div>
      </header>

      <AddBrokerPicker agencies={agencies} disabled={addingToWeek} onAdd={onAddBroker} />

      <p className="data-card-sub" style={{ marginTop: 4 }}>
        Ou cadastre um corretor novo no cadastro global (já entra nesta semana):
      </p>

      <div className="field-grid corr-form">
        <label className="field">
          <span className="field-label">Nome</span>
          <input
            className="field-input"
            value={novoNome}
            onChange={(e) => onNomeChange(e.target.value)}
            placeholder="Nome do corretor"
            disabled={creating}
          />
        </label>
        <label className="field">
          <span className="field-label">Imobiliária</span>
          <select
            className="field-input"
            value={novaImob}
            onChange={(e) => onImobChange(e.target.value)}
            disabled={creating || agencies.length === 0}
          >
            <option value="">
              {agencies.length === 0
                ? "Cadastre uma imobiliária na aba Imobiliárias"
                : "— Sem imobiliária —"}
            </option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Celular</span>
          <input
            className="field-input"
            value={novoCel}
            onChange={(e) => onCelChange(e.target.value)}
            placeholder="(11) 99999-9999"
            disabled={creating}
          />
        </label>
        <button type="button" className="btn btn--primary" onClick={onAdd} disabled={creating}>
          <Plus size={15} strokeWidth={2.25} /> {creating ? "Salvando..." : "Adicionar"}
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table corr-table">
          <thead>
            <tr>
              <th>Corretor</th>
              <th>Imob.</th>
              <th>Celular</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <BrokerRowsSkeleton />
            ) : brokers.length === 0 ? (
              <tr>
                <td colSpan={4} className="data-table-empty">
                  Nenhum corretor cadastrado ainda — adicione acima.
                </td>
              </tr>
            ) : (
              brokers.map((broker) => {
                const isPending = !!pendingBroker[broker.broker_id];
                return (
                  <tr key={broker.broker_id} data-pending={isPending}>
                    <td className="cell-strong">
                      <div className="corr-name">{broker.nome}</div>
                    </td>
                    <td>
                      <span className="chip-soft" data-accent="blue">
                        {broker.imobiliaria || "—"}
                      </span>
                    </td>
                    <td>{broker.celular || "—"}</td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="icon-action"
                        onClick={() => onEdit(broker)}
                        disabled={isPending}
                        aria-label={`Editar ${broker.nome}`}
                      >
                        <Pencil size={14} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="icon-action icon-action--danger"
                        onClick={() => onRemove(broker)}
                        disabled={isPending}
                        aria-label={`Remover ${broker.nome}`}
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// AddBrokerPicker é o seletor em cascata imobiliária → corretor. Com ~80
// imobiliárias e muitos corretores, listar tudo num select só é inviável;
// aqui só busca os corretores da imobiliária escolhida (lazy).
function AddBrokerPicker({
  agencies,
  disabled,
  onAdd,
}: {
  agencies: RealEstateAgency[];
  disabled: boolean;
  onAdd: (brokerId: string) => Promise<boolean>;
}) {
  const [agencyId, setAgencyId] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const brokersQuery = useAgencyFieldBrokers(agencyId, agencyId !== "");
  const brokers = brokersQuery.data ?? [];

  const handleAdd = async () => {
    if (!brokerId) return;
    const ok = await onAdd(brokerId);
    if (ok) setBrokerId("");
  };

  return (
    <div className="field-grid corr-form">
      <label className="field">
        <span className="field-label">Imobiliária</span>
        <select
          className="field-input"
          value={agencyId}
          onChange={(e) => {
            setAgencyId(e.target.value);
            setBrokerId("");
          }}
        >
          <option value="">— Selecione a imobiliária —</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Corretor</span>
        <select
          className="field-input"
          value={brokerId}
          onChange={(e) => setBrokerId(e.target.value)}
          disabled={agencyId === "" || brokersQuery.isLoading}
        >
          <option value="">
            {agencyId === ""
              ? "— Escolha uma imobiliária primeiro —"
              : brokersQuery.isLoading
                ? "Carregando corretores…"
                : brokers.length === 0
                  ? "Nenhum corretor nesta imobiliária"
                  : "— Selecione o corretor —"}
          </option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleAdd}
        disabled={disabled || brokerId === ""}
      >
        <Plus size={15} strokeWidth={2.25} /> Adicionar à semana
      </button>
    </div>
  );
}

type BrokerEditDialogProps = {
  broker: ArsenalBroker;
  agencies: RealEstateAgency[];
  pending: boolean;
  onCancel: () => void;
  onSave: (
    broker: ArsenalBroker,
    next: { real_estate_agency_id: string | null; celular: string | null },
  ) => void;
};

function BrokerEditDialog({ broker, agencies, pending, onCancel, onSave }: BrokerEditDialogProps) {
  const [agencyId, setAgencyId] = useState<string>(broker.real_estate_agency_id ?? "");
  const [celular, setCelular] = useState<string>(broker.celular ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = celular.trim();
    onSave(broker, {
      real_estate_agency_id: agencyId || null,
      celular: trimmed === "" ? null : trimmed,
    });
  };

  if (typeof document === "undefined") return null;

  const backdrop: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(8, 12, 24, 0.55)",
    backdropFilter: "blur(2px)",
    display: "grid",
    placeItems: "center",
    zIndex: 1000,
    padding: "16px",
  };
  const card: CSSProperties = {
    background: "var(--surface, #fff)",
    color: "var(--text, #0f172a)",
    width: "min(420px, 100%)",
    borderRadius: 12,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
    border: "1px solid var(--border, #e2e8f0)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
  const head: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 16px",
    borderBottom: "1px solid var(--border, #e2e8f0)",
  };
  const title: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 600 };
  const body: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    padding: 16,
  };
  const foot: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid var(--border, #e2e8f0)",
  };

  const node = (
    <div
      style={backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="broker-edit-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form style={card} onSubmit={handleSubmit}>
        <header style={head}>
          <h3 id="broker-edit-title" style={title}>
            Editar {broker.nome}
          </h3>
          <button type="button" className="icon-action" aria-label="Fechar" onClick={onCancel}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </header>

        <div style={body}>
          <label className="field">
            <span className="field-label">Imobiliária</span>
            <select
              className="field-input"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              disabled={pending}
            >
              <option value="">— Sem imobiliária —</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Celular</span>
            <input
              type="tel"
              className="field-input"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={pending}
            />
          </label>
        </div>

        <footer style={foot}>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </form>
    </div>
  );

  return createPortal(node, document.body);
}

function BrokerRowsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i}>
          <td colSpan={10} className="cell-skel">
            <div className="sk-row sk-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ============= SEMANA NAV =============

type SemNavProps = {
  loading: boolean;
  semana: number;
  weekNumber: number | null;
  weekStart: string;
  weekEnd: string | null;
  validations: number;
  onSemanaChange: (next: number) => void;
};

function SemNav({
  loading,
  semana,
  weekNumber,
  weekStart,
  weekEnd,
  validations,
  onSemanaChange,
}: SemNavProps) {
  const intervalo = weekEnd ? toBrDateRange(weekStart, weekEnd) : "—";
  return (
    <div className="sem-nav">
      <button
        type="button"
        className="sem-nav-btn"
        onClick={() => onSemanaChange(semana - 1)}
        aria-label="Semana anterior"
      >
        <ChevronLeft size={16} strokeWidth={2} />
      </button>
      <div className="sem-nav-body">
        <div className="sem-nav-title">
          <CalendarDays size={14} strokeWidth={1.75} />{" "}
          {weekNumber == null ? (
            <span className="sk-line sk-line--xs sk-pulse" />
          ) : (
            <>Semana {weekNumber} do ano</>
          )}
        </div>
        <div className="sem-nav-sub">
          {loading ? <span className="sk-line sk-line--sm sk-pulse" /> : intervalo}
        </div>
      </div>
      <div className="sem-nav-meta">
        <ShieldCheck size={14} strokeWidth={1.75} />
        {loading ? (
          <span className="sk-line sk-line--xs sk-pulse" />
        ) : (
          <>
            <strong>{validations}</strong> validações
          </>
        )}
      </div>
      <button
        type="button"
        className="sem-nav-btn"
        onClick={() => onSemanaChange(semana + 1)}
        aria-label="Próxima semana"
      >
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

// ============= AÇÃO LIST (weekly_actions) =============

type SlotDraft = { local: string; participantIds: string[] };

type OfflineActionCreateFormProps = {
  formTag: string;
  formDate: string;
  formObjetivo: string;
  formUnidade: ObjectiveUnit;
  formText: string;
  disabled: boolean;
  creating: boolean;
  onTagChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onObjetivoChange: (value: string) => void;
  onUnidadeChange: (value: ObjectiveUnit) => void;
  onTextChange: (value: string) => void;
  onAdd: () => void;
};

function OfflineActionCreateForm({
  formTag,
  formDate,
  formObjetivo,
  formUnidade,
  formText,
  disabled,
  creating,
  onTagChange,
  onDateChange,
  onObjetivoChange,
  onUnidadeChange,
  onTextChange,
  onAdd,
}: OfflineActionCreateFormProps) {
  return (
    <div className="offline-create-form">
      <div className="acoes-form">
        <div className="acoes-form-head">
          <span className="acoes-form-eyebrow">Nova ação offline</span>
          <span className="acoes-form-hint">
            Cadastro compartilhado com <strong>Ações da Semana</strong> — pressione <kbd>Enter</kbd>{" "}
            na descrição para adicionar
          </span>
        </div>
        <div className="acoes-form-grid">
          <div className="acoes-field">
            <label htmlFor="offline-acao-tag">Tipo de ação</label>
            <select
              id="offline-acao-tag"
              value={formTag}
              onChange={(e) => onTagChange(e.target.value)}
              disabled={disabled}
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
            <label htmlFor="offline-acao-date">Data</label>
            <input
              id="offline-acao-date"
              type="date"
              value={formDate}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="acoes-field">
            <label htmlFor="offline-acao-objetivo">Objetivo</label>
            <div className="acoes-objetivo-group">
              <input
                id="offline-acao-objetivo"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={formObjetivo}
                onChange={(e) => onObjetivoChange(e.target.value)}
                placeholder="Ex: 30"
                disabled={disabled}
              />
              <select
                id="offline-acao-unidade"
                aria-label="Unidade do objetivo"
                value={formUnidade}
                onChange={(e) => onUnidadeChange(e.target.value as ObjectiveUnit)}
                disabled={disabled}
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
            <label htmlFor="offline-acao-text">Descrição da ação</label>
            <input
              id="offline-acao-text"
              type="text"
              value={formText}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Ex: Panfletagem no Shopping Vila Olímpia com 3 promotoras…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating && !disabled) {
                  e.preventDefault();
                  onAdd();
                }
              }}
              disabled={disabled}
            />
          </div>
          <div className="acoes-field acoes-field-add">
            <button
              type="button"
              className="acoes-btn acoes-btn-add"
              onClick={onAdd}
              disabled={disabled}
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden />
              {creating ? "Adicionando…" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ActionEditDraft = {
  actionType: string;
  plannedDate: string;
  objective: string;
  unit: ObjectiveUnit;
  description: string;
};

type ActionEditDialogProps = {
  action: WeeklyActionDTO;
  pending: boolean;
  onCancel: () => void;
  onSave: (action: WeeklyActionDTO, draft: ActionEditDraft) => void;
};

function actionToEditDraft(action: WeeklyActionDTO): ActionEditDraft {
  const unit = (action.objective_type as ObjectiveUnit | null) ?? "leads";
  return {
    actionType: action.action_type,
    plannedDate: action.planned_date ?? "",
    objective: action.objective ?? "",
    unit: OBJECTIVE_UNITS.some((u) => u.value === unit) ? unit : "leads",
    description: action.description ?? "",
  };
}

function ActionEditDialog({ action, pending, onCancel, onSave }: ActionEditDialogProps) {
  const [draft, setDraft] = useState<ActionEditDraft>(() => actionToEditDraft(action));
  const [syncedActionId, setSyncedActionId] = useState(action.id);

  // Reseta o rascunho ao trocar a ação em edição derivando o estado durante a
  // render (padrão recomendado) em vez de sincronizar via efeito.
  if (action.id !== syncedActionId) {
    setSyncedActionId(action.id);
    setDraft(actionToEditDraft(action));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(action, draft);
  };

  if (typeof document === "undefined") return null;

  const node = (
    <div
      className="acoes-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-edit-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        className="acoes-modal"
        style={{ textAlign: "left", maxWidth: 560 }}
        onSubmit={handleSubmit}
      >
        <header style={{ marginBottom: 16 }}>
          <h3 id="action-edit-title" className="acoes-modal-title" style={{ textAlign: "left" }}>
            Editar ação
          </h3>
          <p className="acoes-modal-body" style={{ textAlign: "left", margin: 0 }}>
            {action.action_type}
          </p>
        </header>

        <div className="acoes-form-grid" style={{ marginBottom: 18 }}>
          <div className="acoes-field">
            <label htmlFor="edit-acao-tag">Tipo de ação</label>
            <select
              id="edit-acao-tag"
              value={draft.actionType}
              onChange={(e) => setDraft((d) => ({ ...d, actionType: e.target.value }))}
              disabled={pending}
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
            <label htmlFor="edit-acao-date">Data</label>
            <input
              id="edit-acao-date"
              type="date"
              value={draft.plannedDate}
              onChange={(e) => setDraft((d) => ({ ...d, plannedDate: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="acoes-field">
            <label htmlFor="edit-acao-objetivo">Objetivo</label>
            <div className="acoes-objetivo-group">
              <input
                id="edit-acao-objetivo"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.objective}
                onChange={(e) => setDraft((d) => ({ ...d, objective: e.target.value }))}
                placeholder="Ex: 30"
                disabled={pending}
              />
              <select
                id="edit-acao-unidade"
                aria-label="Unidade do objetivo"
                value={draft.unit}
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value as ObjectiveUnit }))}
                disabled={pending}
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
            <label htmlFor="edit-acao-text">Descrição da ação</label>
            <input
              id="edit-acao-text"
              type="text"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              disabled={pending}
            />
          </div>
        </div>

        <div className="acoes-modal-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(node, document.body);
}

type ResultDraft = { achieved: number | null; completed: boolean; motivo: string };

type AcaoListProps = {
  loading: boolean;
  actions: WeeklyActionDTO[];
  brokers: ArsenalBroker[];
  pendingSlot: Record<string, boolean>;
  savingResultId: string | null;
  onValidateSlot: (action: WeeklyActionDTO, draft: SlotDraft) => Promise<boolean>;
  onUndo: (action: WeeklyActionDTO) => void;
  onEdit: (action: WeeklyActionDTO) => void;
  onSaveResult: (action: WeeklyActionDTO, draft: ResultDraft) => Promise<boolean>;
  emptyLabel: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  campo: "Ação de campo",
  treino: "Treinamento",
  premio: "Premiação",
  outro: "Outros",
};

const UNIT_ICON: Record<string, string> = {
  leads: "📞",
  visitas: "🏠",
  pastas: "📄",
  vendas: "💰",
  corretores: "👥",
};

function actionToResultDraft(action: WeeklyActionDTO): ResultDraft {
  return {
    achieved: action.achieved,
    completed: action.completed,
    motivo: action.non_completion_reason ?? "",
  };
}

function actionToDraft(action: WeeklyActionDTO): SlotDraft {
  return {
    local: action.local ?? "",
    participantIds: (action.participants ?? []).map((p) => p.broker_id),
  };
}

function formatActionDate(iso: string | null): string {
  if (!iso) return "sem data";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function AcaoList({
  loading,
  actions,
  brokers,
  pendingSlot,
  savingResultId,
  onValidateSlot,
  onUndo,
  onEdit,
  onSaveResult,
  emptyLabel,
}: AcaoListProps) {
  const [slotDrafts, setSlotDrafts] = useState<Record<string, SlotDraft>>({});
  const [resultDrafts, setResultDrafts] = useState<Record<string, ResultDraft>>({});

  const mutateDraft = (action: WeeklyActionDTO, mut: (d: SlotDraft) => SlotDraft) => {
    setSlotDrafts((prev) => {
      const cur = prev[action.id] ?? actionToDraft(action);
      return { ...prev, [action.id]: mut(cur) };
    });
  };

  const mutateResultDraft = (action: WeeklyActionDTO, mut: (d: ResultDraft) => ResultDraft) => {
    setResultDrafts((prev) => {
      const cur = prev[action.id] ?? actionToResultDraft(action);
      return { ...prev, [action.id]: mut(cur) };
    });
  };

  const clearResultDraft = (actionId: string) =>
    setResultDrafts((prev) => {
      if (!(actionId in prev)) return prev;
      const next = { ...prev };
      delete next[actionId];
      return next;
    });

  const clearDraft = (actionId: string) =>
    setSlotDrafts((prev) => {
      if (!(actionId in prev)) return prev;
      const next = { ...prev };
      delete next[actionId];
      return next;
    });

  if (loading) {
    return <AcaoListSkeleton />;
  }

  if (actions.length === 0) {
    return (
      <div className="info-banner">
        <Info size={16} strokeWidth={2} />
        <div>{emptyLabel}</div>
      </div>
    );
  }

  return (
    <div className="ar-list">
      {actions.map((action) => {
        const draft = slotDrafts[action.id] ?? actionToDraft(action);
        const resultDraft = resultDrafts[action.id] ?? actionToResultDraft(action);
        const isValidated = Boolean(action.validated_at);
        const isPending = !!pendingSlot[action.id];
        const unvalidatePending = !!pendingSlot[`unvalidate__${action.id}`];
        const isSavingResult = savingResultId === action.id;
        const cat = API_CATEGORY_TO_UI[action.category];
        const showLocal = cat === "campo";
        const kindLabel = CATEGORY_LABEL[cat] ?? "Ação";
        const unitKey = action.objective_type ?? "";
        const unitIcon = unitKey ? (UNIT_ICON[unitKey] ?? "") : "";
        const savedResult = actionToResultDraft(action);
        const resultDirty =
          action.id in resultDrafts &&
          (resultDraft.achieved !== savedResult.achieved ||
            resultDraft.completed !== savedResult.completed ||
            resultDraft.motivo !== savedResult.motivo);
        const canValidate =
          !isValidated &&
          !isPending &&
          draft.participantIds.length > 0 &&
          (!showLocal || draft.local.trim().length > 0);

        return (
          <article
            key={action.id}
            className="ar-row"
            data-accent={cat === "treino" ? "violet" : "emerald"}
            data-validated={isValidated}
          >
            <div className="ar-row-head">
              <span className="ar-row-ico" aria-hidden>
                <Megaphone size={20} strokeWidth={1.75} />
              </span>
              <div className="ar-row-text">
                <div className="ar-row-name">{action.action_type}</div>
                <div className="ar-row-meta">
                  <span className="ar-row-kind">{kindLabel}</span>
                  <span className="ar-row-tag">
                    <CalendarDays size={12} strokeWidth={2} />
                    {formatActionDate(action.planned_date)}
                  </span>
                  {isValidated && (
                    <span className="ar-row-tag">
                      <ShieldCheck size={12} strokeWidth={2} />
                      validada
                    </span>
                  )}
                  {action.achieved !== null && (
                    <span className="ar-result-badge">
                      <Target size={11} strokeWidth={2.5} />
                      {action.achieved}
                      {unitKey ? ` ${unitKey}` : ""}
                    </span>
                  )}
                </div>
              </div>
              {!isValidated && (
                <div className="ar-row-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() => onEdit(action)}
                    aria-label={`Editar ${action.action_type}`}
                  >
                    <Pencil size={13} strokeWidth={2} /> Editar
                  </button>
                </div>
              )}
            </div>

            <div className="ar-row-body">
              {action.description ? <p className="ar-row-desc">{action.description}</p> : null}
              <div className="ar-row-tags">
                {action.objective ? (
                  <span className="ar-row-tag-soft">
                    <ListChecks size={12} strokeWidth={2} /> {action.objective}
                    {action.objective_type ? ` ${action.objective_type}` : ""}
                  </span>
                ) : null}
              </div>

              <div className="ar-result-block">
                <div className="ar-result-field">
                  <label htmlFor={`result-${action.id}`}>Realizado</label>
                  <div className="ar-result-input-wrap">
                    <input
                      id={`result-${action.id}`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={resultDraft.achieved !== null ? String(resultDraft.achieved) : ""}
                      placeholder="—"
                      disabled={isSavingResult}
                      onChange={(e) => {
                        const raw = e.target.value;
                        mutateResultDraft(action, (d) => ({
                          ...d,
                          achieved: raw === "" ? null : Math.max(0, Number(raw) || 0),
                        }));
                      }}
                    />
                    <span className="ar-result-unit">
                      {unitIcon ? <span aria-hidden>{unitIcon}</span> : null}
                      {unitKey || "unidade"}
                    </span>
                  </div>
                </div>
                <label className="ar-result-done">
                  <input
                    type="checkbox"
                    checked={resultDraft.completed}
                    disabled={isSavingResult}
                    onChange={(e) =>
                      mutateResultDraft(action, (d) => ({ ...d, completed: e.target.checked }))
                    }
                  />
                  Ação realizada
                </label>
                {!resultDraft.completed && (
                  <div className="ar-result-field ar-result-motivo">
                    <label htmlFor={`motivo-${action.id}`}>
                      Motivo (obrigatório se não realizada)
                    </label>
                    <input
                      id={`motivo-${action.id}`}
                      type="text"
                      value={resultDraft.motivo}
                      placeholder="Ex: Falta de equipe, cancelamento…"
                      disabled={isSavingResult}
                      onChange={(e) =>
                        mutateResultDraft(action, (d) => ({ ...d, motivo: e.target.value }))
                      }
                    />
                  </div>
                )}
                <div className="ar-result-save">
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    disabled={isSavingResult || !resultDirty}
                    onClick={async () => {
                      const ok = await onSaveResult(action, resultDraft);
                      if (ok) clearResultDraft(action.id);
                    }}
                  >
                    <Save size={13} strokeWidth={2.5} />
                    {isSavingResult ? "Salvando…" : "Salvar resultado"}
                  </button>
                </div>
              </div>

              <div className="ar-day-list">
                <div
                  className="ar-day-row"
                  data-validated={isValidated}
                  data-kind={showLocal ? "acao" : "treinamento"}
                >
                  <span className="ar-day-name">{formatActionDate(action.planned_date)}</span>

                  {showLocal && (
                    <label className="ar-day-local">
                      <MapPin size={13} strokeWidth={1.75} />
                      <input
                        type="text"
                        placeholder="Local / endereço"
                        value={draft.local}
                        disabled={isValidated || isPending}
                        onChange={(e) => {
                          const val = e.target.value;
                          mutateDraft(action, (d) => ({ ...d, local: val }));
                        }}
                      />
                    </label>
                  )}

                  <div className="ar-corr-grid">
                    {brokers.length === 0 && (
                      <span className="ar-corr-empty">
                        Cadastre corretores acima para selecioná-los.
                      </span>
                    )}
                    {brokers.map((b) => {
                      const selected = draft.participantIds.includes(b.broker_id);
                      return (
                        <button
                          key={b.broker_id}
                          type="button"
                          className="ar-corr-chip"
                          data-selected={selected}
                          disabled={isValidated || isPending}
                          onClick={() =>
                            mutateDraft(action, (d) => ({
                              ...d,
                              participantIds: d.participantIds.includes(b.broker_id)
                                ? d.participantIds.filter((id) => id !== b.broker_id)
                                : [...d.participantIds, b.broker_id],
                            }))
                          }
                        >
                          {b.nome}
                        </button>
                      );
                    })}
                  </div>

                  <div className="ar-day-action">
                    {isValidated ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => onUndo(action)}
                        disabled={unvalidatePending}
                      >
                        <X size={13} strokeWidth={2} /> Desfazer
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--success btn--xs"
                        onClick={async () => {
                          const ok = await onValidateSlot(action, draft);
                          if (ok) clearDraft(action.id);
                        }}
                        disabled={!canValidate}
                      >
                        <Check size={13} strokeWidth={2.25} /> Validar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AcaoListSkeleton() {
  return (
    <div className="ar-list" aria-busy="true" aria-label="Carregando armas">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <article key={i} className="ar-row">
          <div className="ar-row-head">
            <span className="ar-row-ico sk-pulse" aria-hidden />
            <div className="ar-row-text">
              <div className="sk-line sk-line--md sk-pulse" />
              <div className="sk-line sk-line--sm sk-pulse sk-mt-sm" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

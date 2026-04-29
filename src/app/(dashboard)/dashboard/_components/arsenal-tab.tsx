"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Coffee,
  Dumbbell,
  GraduationCap,
  Info,
  ListChecks,
  MapPin,
  Megaphone,
  PartyPopper,
  PhoneCall,
  Plus,
  ShieldCheck,
  Smartphone,
  Sword,
  Swords,
  Target,
  Theater,
  Pencil,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { DIAS_SEMANA, PONTOS, type Nivel } from "./arsenal-data";
import { Toast, type ToastKind } from "./toast";

const TOAST_DURATION_MS = 3000;
import {
  createFieldBroker,
  deleteFieldBroker,
  getArsenalWeek,
  isApiError,
  isoWeekNumber,
  patchFieldBroker,
  putBrokerStats,
  unvalidateExecution,
  upsertExecution,
  validateExecution,
  weekStartFromSemana,
  type ArsenalActionWithExecutions,
  type ArsenalBroker,
  type ArsenalExecution,
  type ArsenalIconName,
  type ArsenalWeek,
} from "@/lib/arsenal/api";
import { listAgencies, type RealEstateAgency } from "@/lib/imob/api";

type Filter = "acao" | "treinamento" | "todos";

type StatField = "ind" | "vis" | "pas" | "pas_aprov" | "vendas";

type StatDraft = Partial<Record<StatField, number>>;

const FILTERS: {
  id: Filter;
  label: string;
  Icon: LucideIcon;
  variant: "blue" | "violet" | "emerald";
}[] = [
  { id: "acao", label: "Ações de Campo", Icon: Megaphone, variant: "emerald" },
  { id: "treinamento", label: "Treinamentos", Icon: Dumbbell, variant: "violet" },
  { id: "todos", label: "Ver todos", Icon: ListChecks, variant: "blue" },
];

const ACTION_ICON_MAP: Record<ArsenalIconName, LucideIcon> = {
  Megaphone,
  Sword,
  Smartphone,
  Coffee,
  PhoneCall,
  PartyPopper,
  GraduationCap,
  Target,
  Swords,
  Bell,
  Theater,
};

const WEEKDAY_BY_DIA: Record<string, number> = {
  Segunda: 1,
  Terça: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
};

const NIVEL_ACCENT: Record<Nivel, "blue" | "violet" | "emerald" | "amber"> = {
  Soldado: "blue",
  Capitão: "violet",
  General: "emerald",
  Lenda: "amber",
};

function executionSlotKey(actionId: string, weekday: number): string {
  return `${actionId}__d${weekday}`;
}

function toBrDateRange(weekStart: string, weekEnd: string): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  return `${fmt(weekStart)} — ${fmt(weekEnd)}`;
}

function errorMessage(err: unknown): string {
  if (isApiError(err)) return err.error;
  if (err instanceof Error) return err.message;
  return "Falha na operação.";
}

type Props = {
  semana: number;
  onSemanaChange: (next: number) => void;
};

export function ArsenalTab({ semana, onSemanaChange }: Props) {
  const [filter, setFilter] = useState<Filter>("acao");

  const [week, setWeek] = useState<ArsenalWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novaImob, setNovaImob] = useState(""); // agency id (uuid) or "" for none
  const [novoCel, setNovoCel] = useState("");
  const [creating, setCreating] = useState(false);

  const [agencies, setAgencies] = useState<RealEstateAgency[]>([]);
  useEffect(() => {
    let cancelled = false;
    listAgencies()
      .then((rows) => {
        if (!cancelled) setAgencies(rows);
      })
      .catch(() => {
        // Silent: agency dropdown gracefully degrades to "Sem imobiliária".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [statDrafts, setStatDrafts] = useState<Record<string, StatDraft>>({});
  const [pendingSlot, setPendingSlot] = useState<Record<string, boolean>>({});
  const [pendingBroker, setPendingBroker] = useState<Record<string, boolean>>({});

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

  const reqIdRef = useRef(0);

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

  const loadWeek = useCallback(
    async (signal?: AbortSignal) => {
      if (!weekStart) return;
      const id = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const data = await getArsenalWeek(weekStart);
        if (signal?.aborted || id !== reqIdRef.current) return;
        setWeek(data);
        setStatDrafts({});
      } catch (e: unknown) {
        if (signal?.aborted || id !== reqIdRef.current) return;
        setWeek(null);
        setError(errorMessage(e));
      } finally {
        if (!signal?.aborted && id === reqIdRef.current) {
          setLoading(false);
        }
      }
    },
    [weekStart],
  );

  useEffect(() => {
    if (!weekStart) return;
    const ac = new AbortController();
    queueMicrotask(() => {
      void loadWeek(ac.signal);
    });
    return () => ac.abort();
  }, [weekStart, loadWeek]);

  const apiBrokers: ArsenalBroker[] = week?.brokers ?? [];

  const acaoActions = useMemo<ArsenalActionWithExecutions[]>(
    () => (week?.actions ?? []).filter((a) => a.action.type === "field_action"),
    [week?.actions],
  );
  const trainingActions = useMemo<ArsenalActionWithExecutions[]>(
    () => (week?.actions ?? []).filter((a) => a.action.type === "training"),
    [week?.actions],
  );

  const validations = week?.validations ?? 0;

  const addCorretor = async () => {
    const nome = novoNome.trim();
    if (!nome) {
      showToast("error", "Informe o nome do corretor.");
      return;
    }
    setCreating(true);
    try {
      await createFieldBroker({
        nome,
        real_estate_agency_id: novaImob || null,
        celular: novoCel.trim() || undefined,
      });
      setNovoNome("");
      setNovaImob("");
      setNovoCel("");
      await loadWeek();
      showToast("success", `Corretor ${nome} cadastrado.`);
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const [editingBroker, setEditingBroker] = useState<ArsenalBroker | null>(null);

  const saveBrokerEdit = async (
    broker: ArsenalBroker,
    next: { real_estate_agency_id: string | null; celular: string | null },
  ) => {
    setPendingBroker((prev) => ({ ...prev, [broker.broker_id]: true }));
    try {
      await patchFieldBroker(broker.broker_id, next);
      setEditingBroker(null);
      await loadWeek();
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
    if (!window.confirm(`Remover ${broker.nome}?`)) return;
    setPendingBroker((prev) => ({ ...prev, [broker.broker_id]: true }));
    try {
      await deleteFieldBroker(broker.broker_id);
      await loadWeek();
      showToast("success", `Corretor ${broker.nome} removido.`);
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
    if (!draft || !weekStart) return;
    const payload = {
      week_start: weekStart,
      ind: draft.ind ?? broker.ind,
      vis: draft.vis ?? broker.vis,
      pas: draft.pas ?? broker.pas,
      pas_aprov: draft.pas_aprov ?? broker.pas_aprov,
      vendas: draft.vendas ?? broker.vendas,
    };
    setPendingBroker((prev) => ({ ...prev, [broker.broker_id]: true }));
    try {
      await putBrokerStats(broker.broker_id, payload);
      await loadWeek();
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

  // ============= ACAO (API) =============

  const validateSlot = async (
    actionId: string,
    weekday: number,
    draft: { local: string; participantIds: string[] },
    executionId: string | null,
  ): Promise<boolean> => {
    if (!weekStart) return false;
    const slot = executionSlotKey(actionId, weekday);
    setPendingSlot((prev) => ({ ...prev, [slot]: true }));
    try {
      const row = await upsertExecution(actionId, weekStart, weekday, {
        local: draft.local.trim() || null,
        participant_brokers: draft.participantIds,
      });
      const id = executionId ?? row.id;
      await validateExecution(id);
      await loadWeek();
      const actionName = week?.actions.find((a) => a.action.id === actionId)?.action.nome;
      const diaName = DIAS_SEMANA[weekday - 1] ?? `dia ${weekday}`;
      showToast(
        "success",
        actionName ? `${actionName} validada em ${diaName}!` : "Validação salva com sucesso!",
      );
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

  const undoAcao = async (executionId: string) => {
    const slot = `unvalidate__${executionId}`;
    setPendingSlot((prev) => ({ ...prev, [slot]: true }));
    try {
      await unvalidateExecution(executionId);
      await loadWeek();
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

  // ============= RENDER =============

  return (
    <>
      <div role="tablist" aria-label="Tipo de arma" className="seg">
        {FILTERS.map((f) => {
          const Icon = f.Icon;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-pressed={active}
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={`seg-btn${active ? ` seg-btn--${f.variant}` : ""}`}
            >
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
              {f.label}
            </button>
          );
        })}
      </div>

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

      <BrokersCard
        loading={loading}
        brokers={apiBrokers}
        agencies={agencies}
        statDrafts={statDrafts}
        pendingBroker={pendingBroker}
        novoNome={novoNome}
        novaImob={novaImob}
        novoCel={novoCel}
        creating={creating}
        onNomeChange={setNovoNome}
        onImobChange={setNovaImob}
        onCelChange={setNovoCel}
        onAdd={addCorretor}
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

      <SemNav
        loading={loading || !weekStart}
        semana={semana}
        weekNumber={week?.week_number ?? (weekStart ? isoWeekNumber(weekStart) : null)}
        weekStart={week?.week_start ?? weekStart ?? ""}
        weekEnd={week?.week_end ?? null}
        validations={validations}
        onSemanaChange={onSemanaChange}
      />

      {filter === "treinamento" ? (
        <AcaoList
          loading={loading}
          actions={trainingActions}
          brokers={apiBrokers}
          pendingSlot={pendingSlot}
          onValidateSlot={validateSlot}
          onUndo={undoAcao}
          showLocal={false}
          kindLabel="Treinamento"
          emptyLabel="Nenhum treinamento cadastrado no catálogo."
        />
      ) : filter === "todos" ? (
        <>
          <AcaoList
            loading={loading}
            actions={acaoActions}
            brokers={apiBrokers}
            pendingSlot={pendingSlot}
            onValidateSlot={validateSlot}
            onUndo={undoAcao}
            showLocal
            kindLabel="Ação de campo"
            emptyLabel="Nenhuma ação de campo cadastrada no catálogo."
          />
          <AcaoList
            loading={loading}
            actions={trainingActions}
            brokers={apiBrokers}
            pendingSlot={pendingSlot}
            onValidateSlot={validateSlot}
            onUndo={undoAcao}
            showLocal={false}
            kindLabel="Treinamento"
            emptyLabel="Nenhum treinamento cadastrado no catálogo."
          />
        </>
      ) : (
        <AcaoList
          loading={loading}
          actions={acaoActions}
          brokers={apiBrokers}
          pendingSlot={pendingSlot}
          onValidateSlot={validateSlot}
          onUndo={undoAcao}
          showLocal
          kindLabel="Ação de campo"
          emptyLabel="Nenhuma ação de campo cadastrada no catálogo."
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
  onNomeChange: (value: string) => void;
  onImobChange: (value: string) => void;
  onCelChange: (value: string) => void;
  onAdd: () => void;
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
  onNomeChange,
  onImobChange,
  onCelChange,
  onAdd,
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

// ============= AÇÃO LIST (API) =============

type SlotDraft = { local: string; participantIds: string[] };

type AcaoListProps = {
  loading: boolean;
  actions: ArsenalActionWithExecutions[];
  brokers: ArsenalBroker[];
  pendingSlot: Record<string, boolean>;
  onValidateSlot: (
    actionId: string,
    weekday: number,
    draft: SlotDraft,
    executionId: string | null,
  ) => Promise<boolean>;
  onUndo: (executionId: string) => void;
  showLocal: boolean;
  kindLabel: string;
  emptyLabel: string;
};

function executionToDraft(execution: ArsenalExecution | null): SlotDraft {
  return {
    local: execution?.local ?? "",
    participantIds: execution?.participants.map((p) => p.broker_id) ?? [],
  };
}

function AcaoList({
  loading,
  actions,
  brokers,
  pendingSlot,
  onValidateSlot,
  onUndo,
  showLocal,
  kindLabel,
  emptyLabel,
}: AcaoListProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [slotDrafts, setSlotDrafts] = useState<Record<string, SlotDraft>>({});

  const toggleOpen = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const mutateDraft = (
    slotKey: string,
    execution: ArsenalExecution | null,
    mut: (d: SlotDraft) => SlotDraft,
  ) => {
    setSlotDrafts((prev) => {
      const cur = prev[slotKey] ?? executionToDraft(execution);
      return { ...prev, [slotKey]: mut(cur) };
    });
  };

  const clearDraft = (slotKey: string) =>
    setSlotDrafts((prev) => {
      if (!(slotKey in prev)) return prev;
      const next = { ...prev };
      delete next[slotKey];
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
      {actions.map(({ action, executions }) => {
        const isOpen = !!open[action.id];
        const Icon = ACTION_ICON_MAP[action.icon_name] ?? Megaphone;
        const validatedCount = executions.filter((e) => e?.is_validated).length;
        const hasAny = validatedCount > 0;

        return (
          <article
            key={action.id}
            className="ar-row"
            data-accent={action.accent}
            data-validated={hasAny}
          >
            <button
              type="button"
              className="ar-row-head"
              onClick={() => toggleOpen(action.id)}
              aria-expanded={isOpen}
            >
              <span className="ar-row-ico" aria-hidden>
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <div className="ar-row-text">
                <div className="ar-row-name">{action.nome}</div>
                <div className="ar-row-meta">
                  <span className="ar-row-kind">{kindLabel}</span>
                  {hasAny && (
                    <span className="ar-row-tag">
                      <ShieldCheck size={12} strokeWidth={2} />
                      {validatedCount} validações
                    </span>
                  )}
                </div>
              </div>
              <span className="ar-row-chev" aria-hidden>
                {isOpen ? (
                  <ChevronUp size={16} strokeWidth={2} />
                ) : (
                  <ChevronDown size={16} strokeWidth={2} />
                )}
              </span>
            </button>

            {isOpen && (
              <div className="ar-row-body">
                <p className="ar-row-desc">{action.descricao}</p>
                <div className="ar-row-tags">
                  <span className="ar-row-tag-soft">
                    <ListChecks size={12} strokeWidth={2} /> {action.resultado}
                  </span>
                  {action.custo && (
                    <span className="ar-row-tag-soft ar-row-tag-soft--cost">
                      <CircleDollarSign size={12} strokeWidth={2} /> {action.custo}
                    </span>
                  )}
                </div>

                <div className="ar-day-list">
                  {DIAS_SEMANA.map((dia, idx) => {
                    const weekday = WEEKDAY_BY_DIA[dia];
                    const execution = executions[idx] ?? null;
                    const slotKey = executionSlotKey(action.id, weekday);
                    const isPending = !!pendingSlot[slotKey];
                    const isValidated = execution?.is_validated ?? false;
                    const unvalidatePending =
                      execution && !!pendingSlot[`unvalidate__${execution.id}`];

                    const draft = slotDrafts[slotKey] ?? executionToDraft(execution);
                    const canValidate =
                      !isValidated &&
                      !isPending &&
                      draft.participantIds.length > 0 &&
                      (!showLocal || draft.local.trim().length > 0);

                    return (
                      <div
                        key={dia}
                        className="ar-day-row"
                        data-validated={isValidated}
                        data-kind={showLocal ? "acao" : "treinamento"}
                      >
                        <span className="ar-day-name">{dia}</span>

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
                                mutateDraft(slotKey, execution, (d) => ({
                                  ...d,
                                  local: val,
                                }));
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
                                  mutateDraft(slotKey, execution, (d) => ({
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
                          {isValidated && execution ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--xs"
                              onClick={() => onUndo(execution.id)}
                              disabled={!!unvalidatePending}
                            >
                              <X size={13} strokeWidth={2} /> Desfazer
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--success btn--xs"
                              onClick={async () => {
                                const ok = await onValidateSlot(
                                  action.id,
                                  weekday,
                                  draft,
                                  execution?.id ?? null,
                                );
                                if (ok) clearDraft(slotKey);
                              }}
                              disabled={!canValidate}
                            >
                              <Check size={13} strokeWidth={2.25} /> Validar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

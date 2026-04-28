"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Info,
  Plus,
  Radio,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";

import { fmt } from "./types";
import { Toast, type ToastKind } from "./toast";
import {
  isApiError,
  isoWeekNumber,
  weekStartFromSemana,
  type FieldAction,
} from "@/lib/arsenal/api";
import { apiFetch } from "@/lib/auth";
import {
  OUTBOUND_STATUS_LABEL,
  OUTBOUND_STATUS_LIST,
  createLead,
  deleteLead,
  getOutboundWeek,
  importLeadsSpreadsheet,
  patchLead,
  upsertCost,
  validateAllLeads,
  validateCost,
  type OutboundLead,
  type OutboundRoiRow,
  type OutboundStatus,
  type OutboundWeek,
} from "@/lib/outbound/api";

const TOAST_DURATION_MS = 3000;

type Props = {
  semana: number;
  onSemanaChange: (next: number) => void;
};

function errorMessage(err: unknown): string {
  if (isApiError(err)) return err.error;
  if (err instanceof Error) return err.message;
  return "Falha na operação.";
}

function toBrDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function endOfWeek(weekStartISO: string): string {
  const [y, m, d] = weekStartISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 6);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function OutboundTab({ semana, onSemanaChange }: Props) {
  // Defer weekStart computation to client mount: depends on Date in BR tz,
  // so SSR vs first client render would diverge.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const weekStart = useMemo(
    () => (mounted ? weekStartFromSemana(semana) : null),
    [mounted, semana],
  );

  const [week, setWeek] = useState<OutboundWeek | null>(null);
  const [actions, setActions] = useState<FieldAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [novoAcao, setNovoAcao] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [importAcao, setImportAcao] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const loadWeek = useCallback(
    async (signal?: AbortSignal) => {
      if (!weekStart) return;
      const id = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const data = await getOutboundWeek(weekStart);
        if (signal?.aborted || id !== reqIdRef.current) return;
        setWeek(data);
      } catch (e: unknown) {
        if (signal?.aborted || id !== reqIdRef.current) return;
        setWeek(null);
        setError(errorMessage(e));
      } finally {
        if (!signal?.aborted && id === reqIdRef.current) setLoading(false);
      }
    },
    [weekStart],
  );

  // Load actions catalog once. Filter active + sort by display_order.
  useEffect(() => {
    let cancelled = false;
    apiFetch<FieldAction[]>("/api/v1/field-actions")
      .then((rows) => {
        if (cancelled) return;
        setActions(rows.slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
      })
      .catch(() => {
        // Silent: action selects degrade to empty list and disable themselves.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!weekStart) return;
    const ac = new AbortController();
    queueMicrotask(() => {
      void loadWeek(ac.signal);
    });
    return () => ac.abort();
  }, [weekStart, loadWeek]);

  const leads = useMemo(() => week?.leads ?? [], [week?.leads]);
  const roi = useMemo(() => week?.roi ?? [], [week?.roi]);
  const novosCount = useMemo(() => leads.filter((l) => l.status === "new").length, [leads]);

  const addLead = async () => {
    if (!weekStart) return;
    if (!novoNome.trim()) {
      showToast("error", "Preencha o nome do lead.");
      return;
    }
    if (!novoAcao) {
      showToast("error", "Selecione a ação para o lead.");
      return;
    }
    setCreating(true);
    try {
      await createLead({
        week_start: weekStart,
        action_id: novoAcao,
        name: novoNome.trim(),
        phone: novoTel.trim(),
      });
      setNovoNome("");
      setNovoTel("");
      setNovoAcao("");
      await loadWeek();
      showToast("success", "Lead cadastrado.");
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleFileChosen = async (file: File | null) => {
    if (!file || !weekStart) return;
    if (!importAcao) {
      showToast("error", "Selecione a ação antes de enviar a planilha.");
      return;
    }
    setImporting(true);
    try {
      const res = await importLeadsSpreadsheet({
        file,
        action_id: importAcao,
        week_start: weekStart,
      });
      await loadWeek();
      const skippedNote = res.skipped > 0 ? ` (${res.skipped} ignorados sem nome)` : "";
      showToast("success", `${res.imported} leads importados${skippedNote}.`);
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateStatus = async (id: string, status: OutboundStatus) => {
    const prev = week;
    setWeek((w) =>
      w
        ? {
            ...w,
            leads: w.leads.map((l) => (l.id === id ? { ...l, status, validated: false } : l)),
          }
        : w,
    );
    try {
      const updated = await patchLead(id, { status });
      setWeek((w) => (w ? { ...w, leads: w.leads.map((l) => (l.id === id ? updated : l)) } : w));
    } catch (e: unknown) {
      setWeek(prev);
      showToast("error", errorMessage(e));
    }
  };

  const validateOne = async (id: string) => {
    try {
      const updated = await patchLead(id, { validated: true });
      setWeek((w) => (w ? { ...w, leads: w.leads.map((l) => (l.id === id ? updated : l)) } : w));
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    }
  };

  const validateAll = async () => {
    if (!weekStart) return;
    try {
      await validateAllLeads(weekStart);
      await loadWeek();
      showToast("success", "Todos os leads validados.");
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    }
  };

  const removeLead = async (id: string) => {
    const prev = week;
    setWeek((w) => (w ? { ...w, leads: w.leads.filter((l) => l.id !== id) } : w));
    try {
      await deleteLead(id);
    } catch (e: unknown) {
      setWeek(prev);
      showToast("error", errorMessage(e));
    }
  };

  // -------- ROI editing --------

  const costTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = costTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const editRoi = (
    actionId: string,
    field: "cost_planned" | "cost_real" | "vgv",
    value: number,
  ) => {
    const next = Math.max(0, value);
    setWeek((w) =>
      w
        ? {
            ...w,
            roi: w.roi.map((r) =>
              r.action.id === actionId ? { ...r, [field]: next, validated: false } : r,
            ),
          }
        : w,
    );

    if (!weekStart) return;
    const timers = costTimers.current;
    const existing = timers.get(actionId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      timers.delete(actionId);
      const row = (week?.roi ?? []).find((r) => r.action.id === actionId);
      const draft = {
        cost_planned: row?.cost_planned ?? 0,
        cost_real: row?.cost_real ?? 0,
        vgv: row?.vgv ?? 0,
        [field]: next,
      } as { cost_planned: number; cost_real: number; vgv: number };
      upsertCost({
        week_start: weekStart,
        action_id: actionId,
        ...draft,
      })
        .then((cost) => {
          setWeek((w) =>
            w
              ? {
                  ...w,
                  roi: w.roi.map((r) =>
                    r.action.id === actionId
                      ? {
                          ...r,
                          cost_id: cost.id,
                          cost_planned: cost.cost_planned,
                          cost_real: cost.cost_real,
                          vgv: cost.vgv,
                          validated: cost.validated,
                        }
                      : r,
                  ),
                }
              : w,
          );
        })
        .catch((e: unknown) => showToast("error", errorMessage(e)));
    }, 400);
    timers.set(actionId, t);
  };

  const validateRoi = async (actionId: string) => {
    if (!weekStart) return;
    const row = roi.find((r) => r.action.id === actionId);
    if (!row) return;
    try {
      // Make sure the row exists in the DB before flipping validated.
      const cost = row.cost_id
        ? await validateCost(row.cost_id)
        : await upsertCost({
            week_start: weekStart,
            action_id: actionId,
            cost_planned: row.cost_planned,
            cost_real: row.cost_real,
            vgv: row.vgv,
          }).then((c) => validateCost(c.id));
      setWeek((w) =>
        w
          ? {
              ...w,
              roi: w.roi.map((r) =>
                r.action.id === actionId
                  ? { ...r, cost_id: cost.id, validated: cost.validated }
                  : r,
              ),
            }
          : w,
      );
    } catch (e: unknown) {
      showToast("error", errorMessage(e));
    }
  };

  const validateAllRoi = async () => {
    for (const r of roi) {
      // Sequential to avoid hammering the DB and to keep error messages
      // in order with the row that failed.
      try {
        await validateRoi(r.action.id);
      } catch {
        // already toasted by validateRoi
      }
    }
  };

  // -------- render --------

  const weekNumber = weekStart ? isoWeekNumber(weekStart) : null;
  const weekEnd = weekStart ? endOfWeek(weekStart) : null;
  const intervalo = weekStart && weekEnd ? `${toBrDate(weekStart)} — ${toBrDate(weekEnd)}` : "—";

  return (
    <>
      <div className="info-banner">
        <Info size={16} strokeWidth={2} />
        <div>
          Cadastre os leads novos vindos das ações de campo (planilha ou manual). Os status
          <strong> Em contato, Visitou, Pasta e Venda</strong> migram para o funil do Resumo assim
          que validados.
        </div>
      </div>

      {error && (
        <div className="info-banner" data-state="error">
          <Info size={16} strokeWidth={2} />
          <div>{error}</div>
        </div>
      )}

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
        <button
          type="button"
          className="sem-nav-btn"
          onClick={() => onSemanaChange(semana + 1)}
          aria-label="Próxima semana"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="ob-grid">
        <section className="ob-card" data-accent="amber">
          <header className="ob-card-head">
            <span className="ob-card-ico" data-accent="amber" aria-hidden>
              <Upload size={20} strokeWidth={1.75} />
            </span>
            <div>
              <div className="ob-card-title">Importar leads</div>
              <div className="ob-card-sub">
                Selecione a ação, depois envie a planilha (XLSX, XLS ou CSV).
              </div>
            </div>
          </header>
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="field-label">Vincular à ação</span>
            <select
              className="field-input"
              value={importAcao}
              onChange={(e) => setImportAcao(e.target.value)}
              disabled={importing || actions.length === 0}
            >
              <option value="">— Selecione a ação —</option>
              {actions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="upload-drop" data-disabled={!importAcao || importing}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={!importAcao || importing}
              onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
            />
            <Upload size={20} strokeWidth={1.75} />
            <strong>{importing ? "Importando..." : "Importar planilha"}</strong>
            <span>XLSX, XLS ou CSV — colunas reconhecidas: nome, telefone</span>
          </label>
        </section>

        <section className="ob-card" data-accent="blue">
          <header className="ob-card-head">
            <span className="ob-card-ico" data-accent="blue" aria-hidden>
              <Plus size={20} strokeWidth={2} />
            </span>
            <div>
              <div className="ob-card-title">Cadastro manual</div>
              <div className="ob-card-sub">Captura rápida durante a ação.</div>
            </div>
          </header>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Nome</span>
              <input
                className="field-input"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome do lead"
                disabled={creating}
              />
            </label>
            <label className="field">
              <span className="field-label">Telefone</span>
              <input
                className="field-input"
                value={novoTel}
                onChange={(e) => setNovoTel(e.target.value)}
                placeholder="(00) 00000-0000"
                disabled={creating}
              />
            </label>
            <label className="field">
              <span className="field-label">Ação</span>
              <select
                className="field-input"
                value={novoAcao}
                onChange={(e) => setNovoAcao(e.target.value)}
                disabled={creating || actions.length === 0}
              >
                <option value="">— Selecione —</option>
                {actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={addLead}
            disabled={creating}
          >
            <Plus size={15} strokeWidth={2.25} /> {creating ? "Salvando..." : "Adicionar lead"}
          </button>
        </section>
      </div>

      <section className="kpi-strip" data-accent="sky">
        <div className="kpi-strip-ico" aria-hidden>
          <Radio size={22} strokeWidth={1.75} />
        </div>
        <div className="kpi-strip-text">
          <div className="kpi-strip-label">Leads novos</div>
          <div className="kpi-strip-sub">vindos da planilha ou cadastro manual</div>
        </div>
        <div className="kpi-strip-val">{novosCount}</div>
      </section>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">Leads ({leads.length})</h2>
            <p className="data-card-sub">Atualize o status conforme o atendimento avança.</p>
          </div>
          <button type="button" className="btn btn--success btn--sm" onClick={validateAll}>
            <ShieldCheck size={14} strokeWidth={2.25} /> Validar todos
          </button>
        </header>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Ação</th>
                <th>Status</th>
                <th>Data</th>
                <th>Base JV</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="data-table-empty">
                    Carregando...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="data-table-empty">
                    Nenhum lead cadastrado nesta semana.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <LeadRow
                    key={l.id}
                    lead={l}
                    actions={actions}
                    onStatusChange={updateStatus}
                    onValidate={validateOne}
                    onRemove={removeLead}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <CircleDollarSign size={18} strokeWidth={2} /> ROI por ação
            </h2>
            <p className="data-card-sub">
              Leads, visitas e vendas vêm dos leads outbound da semana. Preencha custos e VGV.
            </p>
          </div>
          <button type="button" className="btn btn--success btn--sm" onClick={validateAllRoi}>
            <ShieldCheck size={14} strokeWidth={2.25} /> Validar todos
          </button>
        </header>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ação</th>
                <th>Custo plan.</th>
                <th>Custo real</th>
                <th>Leads</th>
                <th>Vis</th>
                <th>Ven</th>
                <th>VGV</th>
                <th>ROI</th>
                <th>Base JV</th>
              </tr>
            </thead>
            <tbody>
              {roi.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9} className="data-table-empty">
                    Nenhuma ação ativa no catálogo.
                  </td>
                </tr>
              ) : (
                roi.map((r) => (
                  <RoiRow key={r.action.id} row={r} onEdit={editRoi} onValidate={validateRoi} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}

type LeadRowProps = {
  lead: OutboundLead;
  actions: FieldAction[];
  onStatusChange: (id: string, status: OutboundStatus) => void;
  onValidate: (id: string) => void;
  onRemove: (id: string) => void;
};

function LeadRow({ lead, actions, onStatusChange, onValidate, onRemove }: LeadRowProps) {
  const acao = actions.find((a) => a.id === lead.action_id)?.nome ?? "—";
  return (
    <tr>
      <td className="cell-strong">{lead.name}</td>
      <td className="cell-mute">{lead.phone || "—"}</td>
      <td>
        <span className="chip-soft" data-accent="amber">
          {acao}
        </span>
      </td>
      <td>
        <select
          className="status-select"
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value as OutboundStatus)}
        >
          {OUTBOUND_STATUS_LIST.map((s) => (
            <option key={s} value={s}>
              {OUTBOUND_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="cell-mute">{toBrDate(lead.occurred_on)}</td>
      <td>
        {lead.validated ? (
          <span className="status-pill" data-state="ok">
            <ShieldCheck size={12} strokeWidth={2} /> Salvo
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--success btn--xs"
            onClick={() => onValidate(lead.id)}
          >
            <Check size={12} strokeWidth={2.25} /> Validar
          </button>
        )}
      </td>
      <td className="cell-actions">
        <button
          type="button"
          className="icon-action icon-action--danger"
          onClick={() => onRemove(lead.id)}
          aria-label={`Remover ${lead.name}`}
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  );
}

type RoiRowProps = {
  row: OutboundRoiRow;
  onEdit: (actionId: string, field: "cost_planned" | "cost_real" | "vgv", value: number) => void;
  onValidate: (actionId: string) => void;
};

function RoiRow({ row: r, onEdit, onValidate }: RoiRowProps) {
  const cost = r.cost_real > 0 ? r.cost_real : r.cost_planned;
  const roiValue = cost > 0 && r.vgv > 0 ? `${(((r.vgv - cost) / cost) * 100).toFixed(0)}%` : "—";
  return (
    <tr>
      <td className="cell-strong">{r.action.nome}</td>
      <td>
        <input
          type="number"
          min={0}
          value={r.cost_planned}
          className="cell-input"
          onChange={(e) => onEdit(r.action.id, "cost_planned", Number(e.target.value) || 0)}
        />
      </td>
      <td>
        <input
          type="number"
          min={0}
          value={r.cost_real}
          className="cell-input"
          onChange={(e) => onEdit(r.action.id, "cost_real", Number(e.target.value) || 0)}
        />
      </td>
      <td className="cell-num">{r.leads}</td>
      <td className="cell-num">{r.visitas}</td>
      <td className="cell-num cell-strong">{r.vendas}</td>
      <td>
        <input
          type="number"
          min={0}
          value={r.vgv}
          className="cell-input"
          onChange={(e) => onEdit(r.action.id, "vgv", Number(e.target.value) || 0)}
        />
      </td>
      <td className="cell-num">
        <span className="status-pill" data-state={r.vgv > 0 ? "ok" : "muted"}>
          <TrendingUp size={12} strokeWidth={2} /> {roiValue}
        </span>
      </td>
      <td>
        {r.validated ? (
          <span className="status-pill" data-state="ok">
            <ShieldCheck size={12} strokeWidth={2} /> Salvo
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--success btn--xs"
            onClick={() => onValidate(r.action.id)}
          >
            <Check size={12} strokeWidth={2.25} /> Validar
          </button>
        )}
      </td>
    </tr>
  );
}

// keep VGV cell formatter available for future readonly view
void fmt;

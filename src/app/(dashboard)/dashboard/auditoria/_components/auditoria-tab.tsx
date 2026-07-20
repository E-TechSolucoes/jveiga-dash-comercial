"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  useCreateLeadAuditLead,
  useDeleteLeadAuditLead,
  useImportLeadAudit,
  useLeadAudit,
  useLeadAuditFieldOptions,
  usePatchLeadAuditLead,
  useValidateAllLeadAudit,
} from "@/hooks/use-lead-audit";
import { isApiError } from "@/lib/arsenal/api";
import {
  downloadLeadAuditTemplate,
  LEAD_AUDIT_TEMPLATE_FILENAME,
} from "@/lib/lead-audit/download-template";
import {
  isLeadPrioridade,
  isLeadRespondeu,
  leadAttClass,
  normalizeLeadAuditStats,
  thc,
  type LeadAttClass,
  type LeadAuditLead,
  type LeadAuditStats,
} from "@/lib/lead-audit/api";

import { Toast, type ToastKind } from "../../_components/toast";
import { fmt } from "../../_components/types";

import "./auditoria-tab.css";

const TOAST_MS = 3200;

const ATT_OPTS: { value: LeadAttClass; label: string }[] = [
  { value: "bem", label: "Bem atendido" },
  { value: "mal", label: "Mal atendido" },
  { value: "nunca", label: "Nunca atendido" },
];

type LeadFormState = {
  nome: string;
  tel: string;
  origem: string;
  sit: string;
  obs: string;
  lead_date: string;
};

const EMPTY_FORM: LeadFormState = {
  nome: "",
  tel: "",
  origem: "",
  sit: "",
  obs: "",
  lead_date: "",
};

function leadToForm(lead: LeadAuditLead): LeadFormState {
  return {
    nome: lead.nome || "",
    tel: lead.tel || "",
    origem: lead.origem || "",
    sit: lead.sit || "",
    obs: lead.obs || "",
    lead_date: lead.lead_date ? lead.lead_date.slice(0, 10) : "",
  };
}

type LeadEditorMode = { kind: "create" } | { kind: "edit"; lead: LeadAuditLead };

type Props = {
  empreendimentoIds: number[];
};

function errorMessage(err: unknown): string {
  if (isApiError(err)) return err.error;
  if (err instanceof Error) return err.message;
  return "Falha na operação.";
}

function StackBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, x) => a + x.value, 0) || 1;
  return (
    <div className="audit-sbar-wrap">
      <div className="audit-sbar">
        {segments.map((x) => {
          const pct = Math.round((x.value / total) * 100);
          return (
            <div
              key={x.label}
              title={`${x.label}: ${x.value}`}
              style={{ width: `${(x.value / total) * 100}%`, background: x.color }}
            >
              {pct >= 9 ? `${pct}%` : ""}
            </div>
          );
        })}
      </div>
      <div className="audit-sbar-legend">
        {segments.map((x) => (
          <span key={x.label}>
            <i style={{ background: x.color }} />
            {x.label} <b>{x.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function QualityPanel({ stats }: { stats: LeadAuditStats }) {
  return (
    <>
      <div className="audit-big-title">
        Qualidade — as 3 perguntas da auditoria
        <span className="audit-bt-sub">
          amostra de {fmt(stats.auditados)} leads auditados a fundo
        </span>
      </div>
      <div className="audit-dim-grid">
        <div className="audit-dim" style={{ borderTopColor: "#0ea5e9" }}>
          <h3>📣 Qualidade do lead</h3>
          <div className="audit-dim-q">
            O <b>marketing</b> entregou um lead de verdade? (dos auditados, quantos responderam)
          </div>
          <div className="audit-dim-big" style={{ color: thc(stats.tx_valido) }}>
            {stats.tx_valido}%
          </div>
          <div className="audit-dim-detail">
            <b>{fmt(stats.respondeu)}</b> responderam · <b>{fmt(stats.nao_resp)}</b> não atenderam ·{" "}
            <b>{fmt(stats.invalido)}</b> base inválida
          </div>
        </div>
        <div className="audit-dim" style={{ borderTopColor: "#1226AA" }}>
          <h3>⭐ Qualidade do atendimento</h3>
          <div className="audit-dim-q">
            O <b>comercial</b> atendeu bem? (dos que responderam)
          </div>
          <div className="audit-dim-big" style={{ color: thc(stats.tx_atend) }}>
            {stats.tx_atend}%
          </div>
          <div className="audit-dim-detail">
            <b style={{ color: "#15803d" }}>{fmt(stats.bem)}</b> bem ·{" "}
            <b style={{ color: "#f59e0b" }}>{fmt(stats.mal)}</b> mal ·{" "}
            <b style={{ color: "#ef4444" }}>{fmt(stats.nunca)}</b> nunca atendidos
          </div>
        </div>
        <div className="audit-dim" style={{ borderTopColor: "#15803d" }}>
          <h3>♻️ Recuperação</h3>
          <div className="audit-dim-q">
            Dos que responderam, quantos <b>querem conhecer</b>? (recuperáveis)
          </div>
          <div className="audit-dim-big" style={{ color: "#15803d" }}>
            {fmt(stats.quer)}
          </div>
          <div className="audit-dim-detail">
            <b>{fmt(stats.prioridade)}</b> com prioridade (mal/nunca atendidos) ·{" "}
            <b>{fmt(stats.recup)}</b> já reagendados
          </div>
        </div>
      </div>
    </>
  );
}

function AuditFunnel({ stats, leadsPeriodo }: { stats: LeadAuditStats; leadsPeriodo: number }) {
  const cobertura =
    leadsPeriodo > 0 ? Math.round((stats.auditados / leadsPeriodo) * 100) : stats.cobertura;
  const stages = [
    {
      label: "Auditados pela recepção",
      value: stats.auditados,
      color: "#2563eb",
      conv: null as string | null,
    },
    {
      label: "Contato efetivo · responderam",
      value: stats.respondeu,
      color: "#0ea5e9",
      conv: `${stats.tx_valido}% dos auditados`,
    },
    {
      label: "Querem conhecer · recuperáveis",
      value: stats.quer,
      color: "#8b5cf6",
      conv: `${stats.tx_quer}% dos que responderam`,
    },
  ];

  return (
    <>
      <div className="audit-big-title">
        Funil da auditoria
        <span className="audit-bt-sub">do universo à oportunidade recuperável</span>
      </div>
      <section className="data-card">
        <div className="audit-vfunnel">
          <div
            className="audit-vf-stage audit-vf-top"
            style={{ width: "100%", background: "#1226AA" }}
          >
            <span className="audit-vf-l">Leads no período · CV</span>
            <span className="audit-vf-v">{fmt(leadsPeriodo)}</span>
          </div>
          <div className="audit-vf-conv audit-vf-break">
            ▼ {cobertura}% auditados · amostra de {fmt(stats.auditados)} leads
          </div>
          {stages.map((x, idx) => {
            const w = Math.max(34, Math.round((x.value / (stats.auditados || 1)) * 100));
            return (
              <div key={x.label} className="audit-vf-block">
                {idx > 0 && x.conv ? <div className="audit-vf-conv">▼ {x.conv}</div> : null}
                <div
                  className="audit-vf-stage"
                  style={{ width: `${w}%`, background: x.color } satisfies CSSProperties}
                >
                  <span className="audit-vf-l">{x.label}</span>
                  <span className="audit-vf-v">{fmt(x.value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function AuditSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="audit-field-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt || "__empty"} value={opt}>
          {opt || "—"}
        </option>
      ))}
    </select>
  );
}

export function AuditoriaTab({ empreendimentoIds }: Props) {
  const empreendimentoId = empreendimentoIds[0] ?? null;
  const [page, setPage] = useState(1);
  const [prevEmpId, setPrevEmpId] = useState(empreendimentoId);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [leadsPeriodo, setLeadsPeriodo] = useState<number | null>(null);
  const [editor, setEditor] = useState<LeadEditorMode | null>(null);
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<LeadAuditLead | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (empreendimentoId !== prevEmpId) {
    setPrevEmpId(empreendimentoId);
    setPage(1);
    setLeadsPeriodo(null);
    setEditor(null);
    setPendingDelete(null);
  }

  const { data, isLoading, isError, error } = useLeadAudit(empreendimentoId, page);
  const { data: fieldOpts } = useLeadAuditFieldOptions();
  const importMut = useImportLeadAudit();
  const patchMut = usePatchLeadAuditLead();
  const createMut = useCreateLeadAuditLead();
  const deleteMut = useDeleteLeadAuditLead();
  const validateMut = useValidateAllLeadAudit();

  const totalPages = data?.pagination.pages ?? 1;
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : page;

  if (data && safePage !== page) {
    setPage(safePage);
  }

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const busy =
    importMut.isPending ||
    patchMut.isPending ||
    createMut.isPending ||
    deleteMut.isPending ||
    validateMut.isPending;
  const stats = data?.stats ? normalizeLeadAuditStats(data.stats) : null;
  const periodoValue = leadsPeriodo ?? stats?.total ?? 0;

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditor({ kind: "create" });
  }

  function openEdit(lead: LeadAuditLead) {
    setForm(leadToForm(lead));
    setEditor({ kind: "edit", lead });
  }

  function closeEditor() {
    setEditor(null);
  }

  async function submitEditor(e: FormEvent) {
    e.preventDefault();
    if (empreendimentoId == null || !editor) return;
    const nome = form.nome.trim();
    if (!nome) {
      setToast({ kind: "error", message: "Informe o nome do lead." });
      return;
    }
    try {
      if (editor.kind === "create") {
        await createMut.mutateAsync({
          empreendimento_id: empreendimentoId,
          nome,
          tel: form.tel.trim(),
          origem: form.origem.trim(),
          sit: form.sit.trim(),
          obs: form.obs.trim(),
          lead_date: form.lead_date.trim() || undefined,
        });
        setPage(1);
        setToast({ kind: "success", message: "Lead incluído." });
      } else {
        await patchMut.mutateAsync({
          id: editor.lead.id,
          payload: {
            nome,
            tel: form.tel.trim(),
            origem: form.origem.trim(),
            sit: form.sit.trim(),
            obs: form.obs.trim(),
            lead_date: form.lead_date.trim(),
          },
        });
        setToast({ kind: "success", message: "Lead atualizado." });
      }
      closeEditor();
    } catch (err) {
      setToast({ kind: "error", message: errorMessage(err) });
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
      setToast({ kind: "success", message: "Lead excluído." });
    } catch (err) {
      setToast({ kind: "error", message: errorMessage(err) });
    }
  }

  async function handleFile(file: File | null) {
    if (!file || empreendimentoId == null) return;
    try {
      const res = await importMut.mutateAsync({ file, empreendimento_id: empreendimentoId });
      setPage(1);
      setLeadsPeriodo(null);
      setToast({
        kind: "success",
        message: `${res.imported} leads importados${res.periodo_label ? ` (${res.periodo_label})` : ""}.`,
      });
    } catch (err) {
      setToast({ kind: "error", message: errorMessage(err) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  type FieldKey = "liguei" | "wpp" | "contato" | "quer" | "conectei";

  async function updateField(lead: LeadAuditLead, field: FieldKey, value: string) {
    if (lead[field] === value) return;
    try {
      await patchMut.mutateAsync({ id: lead.id, payload: { [field]: value } });
    } catch (err) {
      setToast({ kind: "error", message: errorMessage(err) });
    }
  }

  async function updateAttClass(lead: LeadAuditLead, next: LeadAttClass) {
    const current = leadAttClass(lead);
    if (current === next) return;
    const payload: { contato: string; atend?: string } = {
      contato: next === "nunca" ? "Não" : "Sim",
    };
    if (next === "mal") {
      const base = (lead.atend || "").trim();
      payload.atend = /mal|ruim|demor|sumiu|reclam/i.test(base)
        ? base
        : base
          ? `${base} · mal atendido`
          : "Mal atendido";
    } else if (next === "bem" && /mal|ruim|demor|sumiu|reclam|ningu/i.test(lead.atend || "")) {
      payload.atend = "Bem atendido";
    }
    try {
      await patchMut.mutateAsync({ id: lead.id, payload });
    } catch (err) {
      setToast({ kind: "error", message: errorMessage(err) });
    }
  }

  async function handleValidateAll() {
    if (empreendimentoId == null) return;
    try {
      const res = await validateMut.mutateAsync(empreendimentoId);
      setToast({
        kind: "success",
        message: `${res.updated} auditorias validadas e prontas para o BigQuery.`,
      });
    } catch (err) {
      setToast({ kind: "error", message: errorMessage(err) });
    }
  }

  if (empreendimentoId == null) {
    return (
      <div className="audit-stack">
        <div className="data-empty">
          Selecione um empreendimento com ID numérico para auditar leads.
        </div>
      </div>
    );
  }

  const meta = data?.meta;
  const periodo = meta?.periodo_label || "semana anterior";
  const uploaded = meta?.uploaded ?? false;
  const prioridade = stats?.prioridade ?? 0;

  return (
    <div className="audit-stack" aria-busy={isLoading || busy}>
      {toast ? (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      ) : null}

      <section className="data-card" data-accent="blue">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <Search size={18} strokeWidth={2} aria-hidden />
              Importar planilha da auditoria
            </h2>
            <p className="data-card-sub">
              Baixe o modelo (export do CV), faça o upload e audite na tabela. Colunas da planilha:{" "}
              <strong>Data · Nome · Telefone · Origem · Situação · Obs</strong>. Liguei?, WhatsApp,
              Atendimento, Quer conhecer? e Reconectar são preenchidos aqui na validação.
            </p>
          </div>
        </header>

        <div className="audit-upload-toolbar">
          <button
            type="button"
            className="btn btn--ghost btn--sm audit-template-btn"
            onClick={() => downloadLeadAuditTemplate()}
          >
            <Download size={15} strokeWidth={2} aria-hidden />
            Baixar modelo CSV
          </button>
          <span className="audit-template-hint">
            Arquivo <strong>{LEAD_AUDIT_TEMPLATE_FILENAME}</strong> com colunas do CV e 2 linhas de
            exemplo — apague os exemplos antes de importar sua planilha real.
          </span>
        </div>

        <label className="upload-drop" data-disabled={busy}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <Upload size={22} strokeWidth={1.75} />
          <strong>
            {importMut.isPending ? "Importando..." : "Arraste ou clique para importar"}
          </strong>
          <span>XLSX · XLS · CSV</span>
        </label>

        <div className="audit-upload-meta">
          <span
            className="audit-upload-status"
            data-state={uploaded ? "ok" : "warn"}
            style={{ margin: 0 }}
          >
            {uploaded ? "✓ Planilha importada" : "⚠ Nenhuma planilha importada ainda"}
          </span>
          <span className="audit-meta-chip">
            Período: <b>{periodo}</b>
          </span>
          <label className="audit-meta-chip audit-periodo-input">
            Total de leads no período (CV):
            <input
              type="number"
              min={0}
              value={periodoValue}
              disabled={busy || !stats}
              onChange={(e) => setLeadsPeriodo(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
        </div>
      </section>

      {isError ? (
        <div className="data-empty">{errorMessage(error)}</div>
      ) : isLoading && !data ? (
        <div className="audit-stack" aria-label="Carregando auditoria">
          <div className="audit-dim-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="audit-dim sk-pulse" style={{ minHeight: 140 }} />
            ))}
          </div>
        </div>
      ) : stats ? (
        <>
          <QualityPanel stats={stats} />
          <AuditFunnel stats={stats} leadsPeriodo={periodoValue || stats.auditados} />

          <section className="data-card">
            <div className="data-card-title" style={{ fontSize: "0.82rem", marginBottom: 4 }}>
              Dos {fmt(stats.respondeu)} que responderam — como foram atendidos
            </div>
            <StackBar
              segments={[
                { label: "Bem atendidos (com corretor)", value: stats.bem, color: "#15803d" },
                { label: "Mal atendidos", value: stats.mal, color: "#f59e0b" },
                { label: "Nunca entraram em contato", value: stats.nunca, color: "#ef4444" },
              ]}
            />
          </section>

          <section className="data-card">
            <div className="data-card-title" style={{ fontSize: "0.82rem", marginBottom: 4 }}>
              Dos {fmt(stats.respondeu)} que responderam — querem conhecer o empreendimento?
            </div>
            <StackBar
              segments={[
                { label: "Querem conhecer (recuperáveis)", value: stats.quer, color: "#8b5cf6" },
                { label: "Sem interesse", value: stats.sem_inter, color: "#94a3b8" },
              ]}
            />
          </section>
        </>
      ) : null}

      {prioridade > 0 ? (
        <section className="data-card" data-accent="amber">
          <h3 className="data-card-title">📨 Recuperar com prioridade ({fmt(prioridade)})</h3>
          <p className="data-card-sub" style={{ margin: 0 }}>
            Leads <strong>reais</strong> que foram <strong>mal atendidos</strong> ou{" "}
            <strong>nunca tiveram um corretor</strong>, mas <strong>querem conhecer</strong> o
            empreendimento. São a maior oportunidade perdida — devolver ao time de vendas com
            prioridade antes que esfriem. Período {periodo}.
          </p>
        </section>
      ) : null}

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h3 className="data-card-title">
              <ClipboardList size={17} aria-hidden />
              Leads auditados ({data?.pagination.total ?? 0})
            </h3>
          </div>
          <div className="data-card-head-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busy || empreendimentoId == null}
              onClick={openCreate}
            >
              <Plus size={15} aria-hidden />
              Incluir lead
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={busy || !data?.leads.length}
              onClick={() => void handleValidateAll()}
            >
              <ShieldCheck size={15} aria-hidden />
              Validar → BigQuery
            </button>
          </div>
        </header>

        <div className="data-table-wrap">
          <table className="data-table audit-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Origem</th>
                <th>Liguei?</th>
                <th>WhatsApp</th>
                <th>Atendimento</th>
                <th>Quer conhecer?</th>
                <th>Reconectar</th>
                <th>Obs</th>
                <th>BQ</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {!data?.leads.length ? (
                <tr>
                  <td colSpan={10} className="data-table-empty">
                    Faça upload da planilha ou inclua um lead manualmente.
                  </td>
                </tr>
              ) : (
                data.leads.map((lead) => {
                  const respondeu = isLeadRespondeu(lead);
                  const att = leadAttClass(lead);
                  return (
                    <tr
                      key={lead.id}
                      className={isLeadPrioridade(lead) ? "audit-row--alert" : undefined}
                    >
                      <td>
                        <strong>{lead.nome || "—"}</strong>
                        {lead.tel ? <div className="audit-cell-sub">{lead.tel}</div> : null}
                      </td>
                      <td>{lead.origem || "—"}</td>
                      <td>
                        <AuditSelect
                          value={lead.liguei}
                          options={fieldOpts?.liguei ?? [lead.liguei]}
                          disabled={busy}
                          onChange={(v) => void updateField(lead, "liguei", v)}
                        />
                      </td>
                      <td>
                        <AuditSelect
                          value={lead.wpp}
                          options={fieldOpts?.wpp ?? [lead.wpp]}
                          disabled={busy}
                          onChange={(v) => void updateField(lead, "wpp", v)}
                        />
                      </td>
                      <td>
                        {!respondeu ? (
                          <span className="audit-muted">—</span>
                        ) : (
                          <select
                            className="audit-field-select"
                            value={att}
                            disabled={busy}
                            onChange={(e) =>
                              void updateAttClass(lead, e.target.value as LeadAttClass)
                            }
                          >
                            {ATT_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <AuditSelect
                          value={lead.quer}
                          options={fieldOpts?.quer ?? [lead.quer]}
                          disabled={busy}
                          onChange={(v) => void updateField(lead, "quer", v)}
                        />
                      </td>
                      <td>
                        <AuditSelect
                          value={lead.conectei}
                          options={fieldOpts?.conectei ?? [lead.conectei]}
                          disabled={busy}
                          onChange={(v) => void updateField(lead, "conectei", v)}
                        />
                      </td>
                      <td className="audit-obs-cell">{lead.obs || lead.atend || ""}</td>
                      <td>
                        <span
                          className={
                            lead.validated
                              ? "audit-dot audit-dot--ok"
                              : "audit-dot audit-dot--pending"
                          }
                          title={lead.validated ? "Validado" : "Pendente"}
                        />
                      </td>
                      <td>
                        <div className="audit-row-actions">
                          <button
                            type="button"
                            className="admin-icon-btn"
                            disabled={busy}
                            onClick={() => openEdit(lead)}
                            aria-label={`Editar ${lead.nome || "lead"}`}
                            title="Editar dados do lead"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn--danger"
                            disabled={busy}
                            onClick={() => setPendingDelete(lead)}
                            aria-label={`Excluir ${lead.nome || "lead"}`}
                            title="Excluir lead"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="audit-footnote" style={{ margin: "10px 14px 4px" }}>
          Linha destacada = <strong>recuperar com prioridade</strong> (quer conhecer + mal/nunca
          atendido). &quot;Atendimento&quot; ajusta a faixa manualmente.
        </p>

        {data && data.pagination.total > 0 ? (
          <div
            className="admin-pager"
            style={{ marginTop: 0, borderRadius: "0 0 var(--radius-md) var(--radius-md)" }}
          >
            <div className="admin-pager-info">
              Mostrando <strong>{(safePage - 1) * data.pagination.limit + 1}</strong>–
              <strong>{Math.min(safePage * data.pagination.limit, data.pagination.total)}</strong>{" "}
              de <strong>{data.pagination.total}</strong> leads
            </div>
            <div className="admin-pager-actions">
              <button
                type="button"
                className="admin-icon-btn"
                disabled={safePage <= 1 || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="admin-pager-page">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className="admin-icon-btn"
                disabled={safePage >= totalPages || busy}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {meta?.all_validated ? (
        <p className="audit-footnote" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={14} aria-hidden />
          Lote validado e pronto para sincronização com o BigQuery.
        </p>
      ) : null}

      {editor ? (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-lead-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <form className="admin-modal" onSubmit={(e) => void submitEditor(e)}>
            <header className="admin-modal-head">
              <h2 id="audit-lead-form-title">
                {editor.kind === "create" ? "Incluir lead" : "Editar lead"}
              </h2>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={closeEditor}
                aria-label="Fechar"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </header>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span className="admin-label">
                  Nome <span className="admin-req">*</span>
                </span>
                <input
                  className="admin-input"
                  type="text"
                  required
                  maxLength={200}
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome do lead"
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Telefone</span>
                <input
                  className="admin-input"
                  type="text"
                  maxLength={50}
                  value={form.tel}
                  onChange={(e) => setForm((f) => ({ ...f, tel: e.target.value }))}
                  placeholder="+55 11 99999-9999"
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Origem</span>
                <input
                  className="admin-input"
                  type="text"
                  maxLength={120}
                  value={form.origem}
                  onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                  placeholder="Facebook, Instagram…"
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Situação</span>
                <input
                  className="admin-input"
                  type="text"
                  maxLength={200}
                  value={form.sit}
                  onChange={(e) => setForm((f) => ({ ...f, sit: e.target.value }))}
                  placeholder="Aguardando Atendimento"
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Data</span>
                <input
                  className="admin-input"
                  type="date"
                  value={form.lead_date}
                  onChange={(e) => setForm((f) => ({ ...f, lead_date: e.target.value }))}
                />
              </label>
              <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                <span className="admin-label">Obs</span>
                <textarea
                  className="admin-input"
                  rows={3}
                  maxLength={2000}
                  value={form.obs}
                  onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))}
                  placeholder="Observação do CV"
                />
              </label>
            </div>

            <footer className="admin-modal-foot">
              <button type="button" className="btn btn--ghost btn--sm" onClick={closeEditor}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={busy || !form.nome.trim()}
              >
                {editor.kind === "create" ? "Incluir" : "Salvar"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-lead-delete-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteMut.isPending) setPendingDelete(null);
          }}
        >
          <div className="admin-modal audit-delete-modal">
            <header className="admin-modal-head">
              <h2 id="audit-lead-delete-title">Excluir lead</h2>
              <button
                type="button"
                className="admin-icon-btn"
                disabled={deleteMut.isPending}
                onClick={() => setPendingDelete(null)}
                aria-label="Fechar"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </header>

            <div className="audit-delete-body">
              <div className="audit-delete-icon" aria-hidden>
                <Trash2 size={22} strokeWidth={2} />
              </div>
              <p className="audit-delete-lead">
                Tem certeza que deseja excluir <strong>{pendingDelete.nome || "este lead"}</strong>?
              </p>
              <dl className="audit-delete-meta">
                {pendingDelete.tel ? (
                  <>
                    <dt>Telefone</dt>
                    <dd>{pendingDelete.tel}</dd>
                  </>
                ) : null}
                {pendingDelete.origem ? (
                  <>
                    <dt>Origem</dt>
                    <dd>{pendingDelete.origem}</dd>
                  </>
                ) : null}
                {pendingDelete.sit ? (
                  <>
                    <dt>Situação</dt>
                    <dd>{pendingDelete.sit}</dd>
                  </>
                ) : null}
                {pendingDelete.obs ? (
                  <>
                    <dt>Obs</dt>
                    <dd>{pendingDelete.obs}</dd>
                  </>
                ) : null}
              </dl>
              <p className="audit-delete-hint">
                A exclusão é registrada em log (quem excluiu e o conteúdo do lead). Não dá para
                desfazer por aqui.
              </p>
            </div>

            <footer className="admin-modal-foot">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={deleteMut.isPending}
                onClick={() => setPendingDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--sm audit-btn-danger"
                disabled={deleteMut.isPending}
                onClick={() => void handleDeleteConfirm()}
              >
                {deleteMut.isPending ? "Excluindo…" : "Excluir lead"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

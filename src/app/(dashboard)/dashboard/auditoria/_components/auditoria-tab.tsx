"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Phone,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";

import {
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
import { isLeadRedistribuir, type LeadAuditLead, type LeadAuditStats } from "@/lib/lead-audit/api";

import { Toast, type ToastKind } from "../../_components/toast";
import { fmt } from "../../_components/types";

const TOAST_MS = 3200;

type Props = {
  empreendimentoIds: number[];
};

function errorMessage(err: unknown): string {
  if (isApiError(err)) return err.error;
  if (err instanceof Error) return err.message;
  return "Falha na operação.";
}

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: "emerald" | "amber" | "rose" | "violet" | "sky" | "teal";
}) {
  return (
    <div className="kpi" data-accent={accent}>
      <div className="kpi-head">
        <span className="icon-box" data-accent={accent}>
          {icon}
        </span>
      </div>
      <div className="kpi-val">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

function StatsGrid({ stats }: { stats: LeadAuditStats }) {
  return (
    <>
      <div className="kpi-row">
        <KpiCard
          label="Leads no período"
          value={fmt(stats.total)}
          icon={<ClipboardList size={20} />}
          accent="sky"
        />
        <KpiCard
          label="Auditados"
          value={fmt(stats.auditados)}
          icon={<CheckCircle2 size={20} />}
          accent="violet"
        />
        <KpiCard
          label="Cobertura"
          value={`${stats.cobertura}%`}
          icon={<Search size={20} />}
          accent="amber"
        />
        <KpiCard
          label="Contato efetivo"
          value={fmt(stats.contato)}
          icon={<Phone size={20} />}
          accent="emerald"
        />
      </div>
      <div className="kpi-row">
        <KpiCard
          label="Nunca atendidos"
          value={fmt(stats.nunca)}
          icon={<AlertTriangle size={20} />}
          accent="rose"
        />
        <KpiCard
          label="Querem conhecer"
          value={fmt(stats.quer)}
          icon={<Search size={20} />}
          accent="amber"
        />
        <KpiCard
          label="Recuperados (agendados)"
          value={fmt(stats.recup)}
          icon={<ShieldCheck size={20} />}
          accent="emerald"
        />
        <KpiCard
          label="Base inválida"
          value={fmt(stats.invalido)}
          icon={<AlertTriangle size={20} />}
          accent="violet"
        />
      </div>
      <p className="audit-footnote">
        {fmt(stats.caixa)} caíram em caixa postal · {fmt(stats.nao_atendeu)} não atenderam
      </p>
    </>
  );
}

type FieldKey = "liguei" | "wpp" | "contato" | "quer" | "conectei";

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
  const fileRef = useRef<HTMLInputElement>(null);

  if (empreendimentoId !== prevEmpId) {
    setPrevEmpId(empreendimentoId);
    setPage(1);
  }

  const { data, isLoading, isError, error } = useLeadAudit(empreendimentoId, page);
  const { data: fieldOpts } = useLeadAuditFieldOptions();
  const importMut = useImportLeadAudit();
  const patchMut = usePatchLeadAuditLead();
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

  const busy = importMut.isPending || patchMut.isPending || validateMut.isPending;

  async function handleFile(file: File | null) {
    if (!file || empreendimentoId == null) return;
    try {
      const res = await importMut.mutateAsync({ file, empreendimento_id: empreendimentoId });
      setPage(1);
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

  async function updateField(lead: LeadAuditLead, field: FieldKey, value: string) {
    if (lead[field] === value) return;
    try {
      await patchMut.mutateAsync({ id: lead.id, payload: { [field]: value } });
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
  const stats = data?.stats;
  const redistribuir = stats?.redistribuir ?? 0;
  const periodo = meta?.periodo_label || "semana anterior";
  const uploaded = meta?.uploaded ?? false;

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
              Auditoria dos Leads — Semana Anterior
            </h2>
            <p className="data-card-sub">
              A recepção audita os leads da <strong>semana anterior</strong>: confirma se o lead{" "}
              <strong>existe</strong>, se foi <strong>atendido</strong> por um corretor, se foi{" "}
              <strong>bem atendido</strong> e se <strong>quer voltar a falar</strong> com o time.
              Faça o upload da planilha do CV no formato padrão.
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
            Baixar modelo Excel
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
            {importMut.isPending ? "Importando..." : "Importar planilha de auditoria"}
          </strong>
          <span>
            XLSX/CSV · colunas: Liguei?, WhatsApp, Como foi o atendimento?, Alguém entrou em
            contato?, Quer conhecer?, Conectei com o time de vendas?
          </span>
        </label>

        <p className="audit-upload-status" data-state={uploaded ? "ok" : "warn"}>
          {uploaded ? "✓ Planilha importada" : "⚠ Nenhuma planilha importada ainda"} · Período:{" "}
          {periodo}
        </p>
      </section>

      {isError ? (
        <div className="data-empty">{errorMessage(error)}</div>
      ) : isLoading && !data ? (
        <div className="audit-stack" aria-label="Carregando auditoria">
          <div className="kpi-row">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="kpi sk-pulse" style={{ minHeight: 110 }} />
            ))}
          </div>
        </div>
      ) : stats ? (
        <StatsGrid stats={stats} />
      ) : null}

      {redistribuir > 0 ? (
        <section className="data-card" data-accent="amber">
          <h3 className="data-card-title">📨 Redistribuir ({redistribuir})</h3>
          <p className="data-card-sub" style={{ margin: 0 }}>
            Leads que <strong>nunca foram atendidos</strong> mas <strong>querem conhecer</strong> o
            empreendimento — devolver ao time de vendas com prioridade.
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
              disabled={busy || !data?.leads.length}
              onClick={() => void handleValidateAll()}
            >
              <ShieldCheck size={15} aria-hidden />
              Validar todos
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
                <th>Foi atendido?</th>
                <th>Quer conhecer?</th>
                <th>Reconectar c/ time</th>
                <th>Obs.</th>
                <th>BQ</th>
              </tr>
            </thead>
            <tbody>
              {!data?.leads.length ? (
                <tr>
                  <td colSpan={9} className="data-table-empty">
                    Faça upload da planilha para ver os leads
                  </td>
                </tr>
              ) : (
                data.leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={isLeadRedistribuir(lead) ? "audit-row--alert" : undefined}
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
                      <AuditSelect
                        value={lead.contato}
                        options={fieldOpts?.contato ?? [lead.contato]}
                        disabled={busy}
                        onChange={(v) => void updateField(lead, "contato", v)}
                      />
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
                    <td className="audit-obs-cell">{lead.atend || lead.obs || ""}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Home,
  UserRound,
  XCircle,
} from "lucide-react";

import { fmt, type PastasKpis } from "../../_components/types";

type PastasPessoaItem = {
  pessoa: string;
  situacao: string;
  valorTotal: number;
  idsituacao: number | null;
  empreendimento: string;
  corretor: string;
  unidade: string;
  referenciaData: string | null;
  idPasta: string | null;
};

type Props = {
  semNome: boolean;
  empresasNomes: string[];
  empresasCodigos: string[];
  periodBounds: { from: string; to: string } | null;
  loading: boolean;
  error: string | null;
  kpis: PastasKpis | null;
};

function KpiSkeleton() {
  return (
    <div className="kpi-val" aria-hidden>
      <span
        className="sk-pulse sk-line sk-line--xl"
        style={{ display: "block", minWidth: "3ch" }}
      />
    </div>
  );
}

function fmtBrl(n: number): string {
  return (n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Data curta a partir de `referencia_data` (YYYY-MM-DD …). */
function fmtRefDateShort(s: string | null): string {
  if (!s) return "—";
  const part = s.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (m) return `${m[3]}/${m[2]}`;
  return part.length >= 5 ? part.slice(0, 5) : "—";
}

function situacaoTone(idsituacao: number | null): "ok" | "warn" | "bad" {
  if (idsituacao === 5) return "ok";
  if (idsituacao === 3 || idsituacao === 6) return "bad";
  return "warn";
}

/** Remove o rótulo longo "Análise do Correspondente" do badge (idsituacao 2). */
function situacaoBadgeLabel(situacao: string | null | undefined): string {
  const n = (situacao ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (n === "analise do correspondente") return "Em análise";
  return (situacao ?? "").trim() || "—";
}

function hasField(v: string | null | undefined): boolean {
  const s = (v ?? "").trim();
  return Boolean(s && s !== "—");
}

function PastaCardFields({ row }: { row: PastasPessoaItem }) {
  const blocks: ReactNode[] = [];
  if (hasField(row.unidade)) {
    blocks.push(
      <div key="unidade" className="pasta-field pasta-field--unidade" title={row.unidade}>
        <span className="pasta-field-ico" aria-hidden>
          <Home size={15} strokeWidth={2} />
        </span>
        <span className="pasta-field-text">
          <span className="pasta-field-label">Unidade</span>
          <span className="pasta-field-value">{row.unidade}</span>
        </span>
      </div>,
    );
  }
  if (hasField(row.empreendimento)) {
    blocks.push(
      <div key="emp" className="pasta-field pasta-field--empreendimento" title={row.empreendimento}>
        <span className="pasta-field-ico" aria-hidden>
          <Building2 size={15} strokeWidth={2} />
        </span>
        <span className="pasta-field-text">
          <span className="pasta-field-label">Empreendimento</span>
          <span className="pasta-field-value">{row.empreendimento}</span>
        </span>
      </div>,
    );
  }
  if (hasField(row.corretor)) {
    blocks.push(
      <div key="corr" className="pasta-field pasta-field--corretor" title={row.corretor}>
        <span className="pasta-field-ico" aria-hidden>
          <UserRound size={15} strokeWidth={2} />
        </span>
        <span className="pasta-field-text">
          <span className="pasta-field-label">Corretor</span>
          <span className="pasta-field-value">{row.corretor}</span>
        </span>
      </div>,
    );
  }
  if (blocks.length === 0) {
    return (
      <div className="pasta-fields pasta-fields--empty" aria-label="Dados do empreendimento">
        —
      </div>
    );
  }
  return (
    <div className="pasta-fields" aria-label="Unidade, empreendimento e corretor">
      {blocks}
    </div>
  );
}

function PastaCard({ row }: { row: PastasPessoaItem }) {
  const tone = situacaoTone(row.idsituacao);

  return (
    <article className="pasta-card" data-tone={tone}>
      <header className="pasta-card-head">
        <div className="pasta-card-cliente">{row.pessoa?.trim() ? row.pessoa : "—"}</div>
        <span className="pasta-card-status" data-tone={tone}>
          {situacaoBadgeLabel(row.situacao)}
        </span>
      </header>

      <PastaCardFields row={row} />

      <div className="pasta-card-row">
        <span className="pasta-card-val">{fmtBrl(row.valorTotal)}</span>
        <span className="pasta-card-date">{fmtRefDateShort(row.referenciaData)}</span>
      </div>

      <footer className="pasta-card-foot">
        <FileText size={13} strokeWidth={1.75} aria-hidden />
        Pasta CV · #{row.idPasta ?? "—"}
      </footer>
    </article>
  );
}

function PastaCardSkel() {
  return (
    <article className="pasta-card" aria-hidden>
      <div className="pasta-card-head">
        <span className="sk-pulse sk-line sk-line--lg sk-grow" />
        <span className="sk-pulse sk-line" style={{ width: 100, height: 22, borderRadius: 999 }} />
      </div>
      <div className="pasta-fields" aria-hidden>
        <span className="pasta-field pasta-field--empreendimento" style={{ opacity: 0.55 }}>
          <span className="pasta-field-ico sk-pulse" style={{ borderRadius: 9 }} />
          <span className="pasta-field-text">
            <span className="sk-pulse sk-line" style={{ width: 72, height: 9 }} />
            <span
              className="sk-pulse sk-line sk-line--lg"
              style={{ marginTop: 4, maxWidth: 140 }}
            />
          </span>
        </span>
        <span className="pasta-field pasta-field--corretor" style={{ opacity: 0.55 }}>
          <span className="pasta-field-ico sk-pulse" style={{ borderRadius: 9 }} />
          <span className="pasta-field-text">
            <span className="sk-pulse sk-line" style={{ width: 56, height: 9 }} />
            <span className="sk-pulse sk-line" style={{ marginTop: 4, width: 96, height: 14 }} />
          </span>
        </span>
      </div>
      <div className="pasta-card-row">
        <span className="sk-pulse sk-line sk-line--xl" style={{ width: "45%" }} />
        <span className="sk-pulse sk-line" style={{ width: 40 }} />
      </div>
      <footer className="pasta-card-foot">
        <span className="sk-pulse sk-line" style={{ width: 120, height: 12 }} />
      </footer>
    </article>
  );
}

const PASTAS_PAGE_SIZE = 8;

function PastasListSection({
  empresasNomes,
  empresasCodigos,
  periodBounds,
}: {
  empresasNomes: string[];
  empresasCodigos: string[];
  periodBounds: { from: string; to: string };
}) {
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listTotal, setListTotal] = useState(0);
  const [items, setItems] = useState<PastasPessoaItem[]>([]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listTotal / PASTAS_PAGE_SIZE)),
    [listTotal],
  );

  const nomesKey = empresasNomes.join("||");
  const codigosKey = empresasCodigos.join(",");

  useEffect(() => {
    const ac = new AbortController();
    const signal = ac.signal;

    void (async () => {
      await Promise.resolve();
      if (signal.aborted) return;
      if (empresasNomes.length === 0 || !periodBounds) return;

      setListLoading(true);
      setListError(null);
      try {
        const params = new URLSearchParams({
          nomes: nomesKey,
          codigos: codigosKey,
          from: periodBounds.from,
          to: periodBounds.to,
          page: String(page),
        });
        const res = await fetch(`/api/dashboard/pastas/list?${params.toString()}`, {
          signal,
          cache: "no-store",
        });
        if (signal.aborted) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setItems([]);
          setListTotal(0);
          setListError(body?.error ?? "Não foi possível carregar a lista.");
          return;
        }
        const data = (await res.json()) as {
          total?: number;
          items?: PastasPessoaItem[];
        };
        if (signal.aborted) return;
        const total = Number(data.total ?? 0);
        setListTotal(total);
        setItems(Array.isArray(data.items) ? data.items : []);
        setListError(null);
        const tp = Math.max(1, Math.ceil(total / PASTAS_PAGE_SIZE));
        setPage((prev) => Math.min(prev, tp));
      } catch (e) {
        if ((e as Error).name === "AbortError" || signal.aborted) return;
        setItems([]);
        setListTotal(0);
        setListError("Não foi possível carregar a lista.");
      } finally {
        if (!signal.aborted) setListLoading(false);
      }
    })();

    return () => ac.abort(new DOMException("Superseded pastas list", "AbortError"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, nomesKey, codigosKey, periodBounds]);

  const fromIdx = listTotal === 0 ? 0 : (page - 1) * PASTAS_PAGE_SIZE + 1;
  const toIdx = listTotal === 0 ? 0 : Math.min(page * PASTAS_PAGE_SIZE, listTotal);

  return (
    <section className="pastas-list-section" aria-label="Pastas no período">
      <div className="pastas-list-head">
        <h3 className="pastas-list-title">Pessoas no filtro</h3>
        <p className="pastas-list-meta">
          {listLoading ? (
            "Carregando lista…"
          ) : (
            <>
              <strong>{fmt(listTotal)}</strong>{" "}
              {listTotal === 1 ? "nome encontrado" : "nomes encontrados"}{" "}
              <span className="pastas-list-meta-sep">·</span> empreendimento e período atuais
            </>
          )}
        </p>
      </div>

      {listError ? (
        <div className="info-banner info-banner--warn" style={{ marginTop: 12 }}>
          <AlertTriangle size={16} strokeWidth={2} />
          <div>{listError}</div>
        </div>
      ) : null}

      {listLoading ? (
        <div className="pasta-grid">
          {Array.from({ length: PASTAS_PAGE_SIZE }).map((_, i) => (
            <PastaCardSkel key={i} />
          ))}
        </div>
      ) : listTotal === 0 ? (
        <div className="data-empty" style={{ marginTop: 12 }}>
          Nenhuma pasta no período para este empreendimento.
        </div>
      ) : (
        <>
          <div className="pasta-grid">
            {items.map((row, idx) => (
              <PastaCard
                key={row.idPasta ?? `${row.pessoa}-${row.referenciaData}-${idx}`}
                row={row}
              />
            ))}
          </div>

          <div className="admin-pager" style={{ marginTop: 4, borderRadius: "var(--radius-md)" }}>
            <div className="admin-pager-info">
              {listTotal > 0 ? (
                <>
                  Exibindo <strong>{fromIdx}</strong>–<strong>{toIdx}</strong> de{" "}
                  <strong>{fmt(listTotal)}</strong>
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="admin-pager-actions">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
              <span className="admin-pager-page">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Próxima página"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function PastasTab({
  semNome,
  empresasNomes,
  empresasCodigos,
  periodBounds,
  loading,
  error,
  kpis,
}: Props) {
  const showDash = semNome;
  const showSkeleton = !semNome && !error && (loading || kpis === null);

  return (
    <>
      {semNome ? (
        <div className="info-banner info-banner--warn">
          <AlertTriangle size={16} strokeWidth={2} />
          <div>
            <strong>Empreendimento:</strong> selecione um empreendimento no filtro superior para
            carregar os totais de pastas (BigQuery <code className="text-xs">dwh.Pastas</code>,
            campo <code className="text-xs">empreendimento</code>).
          </div>
        </div>
      ) : (
        <div className="info-banner" style={{ borderColor: "var(--line)", background: "#fafafa" }}>
          <FolderOpen size={16} strokeWidth={2} />
          <div>
            Totais filtrados por <code className="text-xs">empreendimento</code> (nome) e{" "}
            <code className="text-xs">referencia_data</code> no período; agrupamento por{" "}
            <code className="text-xs">idsituacao</code> (Aprovado → Concluídas; Cancelada /
            Reprovado → Distratadas; demais → Em andamento).
          </div>
        </div>
      )}

      {error && !semNome ? (
        <div className="info-banner info-banner--warn">
          <AlertTriangle size={16} strokeWidth={2} />
          <div>{error}</div>
        </div>
      ) : null}

      <div className="kpi-row">
        <article className="kpi" data-accent="blue">
          <div className="kpi-head">
            <div className="icon-box">
              <FolderOpen aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          {showDash ? (
            <div className="kpi-val">—</div>
          ) : showSkeleton ? (
            <KpiSkeleton />
          ) : (
            <div className="kpi-val">{kpis?.total ?? "—"}</div>
          )}
          <div className="kpi-label">Total</div>
          <div className="kpi-sub">Pastas no período</div>
        </article>
        <article className="kpi" data-accent="amber">
          <div className="kpi-head">
            <div className="icon-box">
              <Clock aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          {showDash ? (
            <div className="kpi-val">—</div>
          ) : showSkeleton ? (
            <KpiSkeleton />
          ) : (
            <div className="kpi-val">{kpis?.emAndamento ?? "—"}</div>
          )}
          <div className="kpi-label">Em andamento</div>
          <div className="kpi-sub">
            Demais situações + exceção / agência / formulários / pendência
          </div>
        </article>
        <article className="kpi" data-accent="emerald">
          <div className="kpi-head">
            <div className="icon-box">
              <CheckCircle2 aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          {showDash ? (
            <div className="kpi-val">—</div>
          ) : showSkeleton ? (
            <KpiSkeleton />
          ) : (
            <div className="kpi-val">{kpis?.concluidas ?? "—"}</div>
          )}
          <div className="kpi-label">Concluídas</div>
          <div className="kpi-sub">Aprovado (idsituacao 5)</div>
        </article>
        <article className="kpi" data-accent="rose">
          <div className="kpi-head">
            <div className="icon-box">
              <XCircle aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          {showDash ? (
            <div className="kpi-val">—</div>
          ) : showSkeleton ? (
            <KpiSkeleton />
          ) : (
            <div className="kpi-val">{kpis?.distratadas ?? "—"}</div>
          )}
          <div className="kpi-label">Distratadas</div>
          <div className="kpi-sub">Cancelada ou Reprovado</div>
        </article>
      </div>

      {!semNome && periodBounds && !error ? (
        <PastasListSection
          key={`${empresasNomes.join("||")}|${periodBounds.from}|${periodBounds.to}`}
          empresasNomes={empresasNomes}
          empresasCodigos={empresasCodigos}
          periodBounds={periodBounds}
        />
      ) : null}
    </>
  );
}

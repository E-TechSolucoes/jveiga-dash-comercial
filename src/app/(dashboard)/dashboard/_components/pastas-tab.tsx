"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { fmt } from "./types";

type EtapaId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type DocStatus = {
  rg: boolean;
  cpf: boolean;
  renda: boolean;
  certidao: boolean;
  fgts: boolean;
};

type Pasta = {
  id: string;
  cliente: string;
  unidade: string;
  valor: number;
  corretor: string;
  data: string;
  status: string;
  etapa: EtapaId;
  docs: DocStatus;
};

const ETAPA_LABELS = [
  "Distratada",
  "Documentação",
  "Análise de Crédito",
  "Aprovação",
  "Aprovado",
  "Contrato",
  "Venda Concluída",
];

const STATUS_OPTIONS: string[] = [
  "Documentação",
  "Análise de Crédito",
  "Aprovado",
  "Contrato",
  "Venda Concluída",
];

const PASTAS_MOCK: Pasta[] = [
  {
    id: "p1",
    cliente: "Pedro Henrique",
    unidade: "Apt 302 T-A",
    valor: 420_000,
    corretor: "Ana Souza",
    data: "18/03",
    status: "Análise de Crédito",
    etapa: 2,
    docs: { rg: true, cpf: true, renda: true, certidao: false, fgts: false },
  },
  {
    id: "p2",
    cliente: "Juliana Santos",
    unidade: "Apt 1205 T-B",
    valor: 510_000,
    corretor: "Bia Martins",
    data: "20/03",
    status: "Documentação",
    etapa: 1,
    docs: { rg: true, cpf: true, renda: false, certidao: false, fgts: false },
  },
  {
    id: "p3",
    cliente: "Marcos Oliveira",
    unidade: "Apt 704 T-A",
    valor: 380_000,
    corretor: "Bia Martins",
    data: "19/03",
    status: "Aprovado",
    etapa: 4,
    docs: { rg: true, cpf: true, renda: true, certidao: true, fgts: true },
  },
  {
    id: "p4",
    cliente: "Luciana Barros",
    unidade: "Apt 401 T-C",
    valor: 385_000,
    corretor: "Bia Martins",
    data: "12/03",
    status: "Venda Concluída",
    etapa: 6,
    docs: { rg: true, cpf: true, renda: true, certidao: true, fgts: true },
  },
];

const DOC_LABEL: Record<keyof DocStatus, string> = {
  rg: "RG",
  cpf: "CPF",
  renda: "Renda",
  certidao: "Certidão",
  fgts: "FGTS",
};

function etapaTone(etapa: EtapaId): "ok" | "warn" | "bad" | "muted" {
  if (etapa === 6) return "ok";
  if (etapa === 0) return "bad";
  return "warn";
}

export function PastasTab() {
  const [pastas] = useState<Pasta[]>(PASTAS_MOCK);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pastas.filter((p) => {
      const matchQ = !q || `${p.cliente} ${p.unidade} ${p.corretor}`.toLowerCase().includes(q);
      const matchF = !filtro || p.status === filtro;
      return matchQ && matchF;
    });
  }, [pastas, busca, filtro]);

  const counters = useMemo(() => {
    const total = pastas.length;
    const andamento = pastas.filter((p) => p.etapa > 0 && p.etapa < 6).length;
    const concluidas = pastas.filter((p) => p.etapa === 6).length;
    const distratadas = pastas.filter((p) => p.etapa === 0).length;
    return { total, andamento, concluidas, distratadas };
  }, [pastas]);

  return (
    <>
      <div className="info-banner info-banner--warn">
        <AlertTriangle size={16} strokeWidth={2} />
        <div>
          <strong>Integração:</strong> status de RG / CPF / Renda / Certidão / FGTS é mockado.
          Aguardando endpoint REST do CV CRM. Pasta e status geral já vêm da Base JV.
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={15} strokeWidth={1.75} />
          <input
            type="search"
            placeholder="Buscar cliente, unidade ou corretor"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button type="button" className="search-clear" onClick={() => setBusca("")}>
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </label>
        <select
          className="field-input filter-select"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="kpi-row">
        <article className="kpi" data-accent="blue">
          <div className="kpi-head">
            <div className="icon-box">
              <FolderOpen aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{counters.total}</div>
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
          <div className="kpi-val">{counters.andamento}</div>
          <div className="kpi-label">Em andamento</div>
          <div className="kpi-sub">Análise / Doc / Contrato</div>
        </article>
        <article className="kpi" data-accent="emerald">
          <div className="kpi-head">
            <div className="icon-box">
              <CheckCircle2 aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{counters.concluidas}</div>
          <div className="kpi-label">Concluídas</div>
          <div className="kpi-sub">Venda assinada</div>
        </article>
        <article className="kpi" data-accent="rose">
          <div className="kpi-head">
            <div className="icon-box">
              <XCircle aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{counters.distratadas}</div>
          <div className="kpi-label">Distratadas</div>
          <div className="kpi-sub">Cancelamentos</div>
        </article>
      </div>

      {filtered.length === 0 ? (
        <div className="data-empty">Nenhuma pasta encontrada com os filtros atuais.</div>
      ) : (
        <div className="pasta-grid">
          {filtered.map((p) => {
            const tone = etapaTone(p.etapa);
            const docCount = Object.values(p.docs).filter(Boolean).length;
            const docTotal = Object.keys(p.docs).length;
            return (
              <article key={p.id} className="pasta-card" data-tone={tone}>
                <header className="pasta-card-head">
                  <div className="pasta-card-cliente">{p.cliente}</div>
                  <span className="pasta-card-status" data-tone={tone}>
                    {p.status}
                  </span>
                </header>
                <div className="pasta-card-meta">
                  <span>{p.unidade}</span>
                  <span className="dot-sep" aria-hidden>
                    ·
                  </span>
                  <span>{p.corretor}</span>
                </div>
                <div className="pasta-card-row">
                  <span className="pasta-card-val">R$ {fmt(p.valor)}</span>
                  <span className="pasta-card-date">{p.data}</span>
                </div>

                <div className="pasta-progress" aria-label={`Etapa ${p.etapa} de 6`}>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const state = idx < p.etapa ? "done" : idx === p.etapa ? "current" : "todo";
                    return (
                      <span
                        key={idx}
                        className="pasta-progress-dot"
                        data-state={state}
                        aria-hidden
                      />
                    );
                  })}
                </div>
                <div className="pasta-progress-meta">
                  <span>{ETAPA_LABELS[p.etapa]}</span>
                  <span>
                    {docCount} / {docTotal} docs
                  </span>
                </div>

                <ul className="pasta-docs">
                  {(Object.keys(p.docs) as Array<keyof DocStatus>).map((key) => {
                    const ok = p.docs[key];
                    return (
                      <li key={key} className="pasta-doc" data-ok={ok}>
                        {ok ? (
                          <CheckCircle2 size={12} strokeWidth={2} />
                        ) : (
                          <XCircle size={12} strokeWidth={2} />
                        )}
                        <span>{DOC_LABEL[key]}</span>
                      </li>
                    );
                  })}
                </ul>

                <footer className="pasta-card-foot">
                  <FileText size={13} strokeWidth={1.75} />
                  Pasta CV · #{p.id.toUpperCase()}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

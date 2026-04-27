"use client";

import { useMemo, useState } from "react";
import {
  Check,
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

type LeadStatus = "Novo" | "Contatado" | "Agendado" | "Visitou" | "Pasta" | "Venda";

type Acao = { id: string; label: string };

type Lead = {
  id: string;
  nome: string;
  tel: string;
  acaoId: string;
  corretor: string;
  status: LeadStatus;
  data: string;
  validated: boolean;
};

type RoiRow = {
  id: string;
  acao: string;
  custo: number;
  custoReal: number;
  leads: number;
  visitas: number;
  vendas: number;
  vgv: number;
  validated: boolean;
};

const STATUS_OPTIONS: LeadStatus[] = ["Novo", "Contatado", "Agendado", "Visitou", "Pasta", "Venda"];

const ACOES_MOCK: Acao[] = [
  { id: "blitz-guara", label: "Panfletagem · Feira do Guará" },
  { id: "port-lago", label: "Portaria · Cond. Lago Sul" },
  { id: "evento-stand", label: "Evento · Stand Shopping" },
  { id: "ig-ads", label: "Digital · Instagram Ads" },
];

const LEADS_MOCK: Lead[] = [
  {
    id: "l1",
    nome: "Roberto Alves",
    tel: "(61) 99812-3456",
    acaoId: "blitz-guara",
    corretor: "Ana",
    status: "Agendado",
    data: "17/03",
    validated: true,
  },
  {
    id: "l2",
    nome: "Fernanda Costa",
    tel: "(61) 98765-4321",
    acaoId: "port-lago",
    corretor: "Carlos",
    status: "Contatado",
    data: "18/03",
    validated: true,
  },
  {
    id: "l3",
    nome: "Pedro Henrique",
    tel: "(61) 99321-6543",
    acaoId: "blitz-guara",
    corretor: "Ana",
    status: "Venda",
    data: "17/03",
    validated: true,
  },
];

const ROI_MOCK: RoiRow[] = [
  {
    id: "r1",
    acao: "Panfletagem · Feira do Guará",
    custo: 1200,
    custoReal: 0,
    leads: 12,
    visitas: 3,
    vendas: 1,
    vgv: 420_000,
    validated: false,
  },
  {
    id: "r2",
    acao: "Portaria · Cond. Lago Sul",
    custo: 800,
    custoReal: 0,
    leads: 8,
    visitas: 2,
    vendas: 0,
    vgv: 0,
    validated: false,
  },
  {
    id: "r3",
    acao: "Evento · Stand Shopping",
    custo: 3500,
    custoReal: 0,
    leads: 15,
    visitas: 5,
    vendas: 2,
    vgv: 890_000,
    validated: false,
  },
  {
    id: "r4",
    acao: "Digital · Instagram Ads",
    custo: 4200,
    custoReal: 0,
    leads: 22,
    visitas: 4,
    vendas: 1,
    vgv: 385_000,
    validated: false,
  },
];

function todayBr(): string {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function acaoLabel(id: string): string {
  return ACOES_MOCK.find((a) => a.id === id)?.label ?? "—";
}

export function OutboundTab() {
  const [leads, setLeads] = useState<Lead[]>(LEADS_MOCK);
  const [roi, setRoi] = useState<RoiRow[]>(ROI_MOCK);

  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [novoAcao, setNovoAcao] = useState<string>("");
  const [novoCorretor, setNovoCorretor] = useState("");

  const novosCount = useMemo(() => leads.filter((l) => l.status === "Novo").length, [leads]);

  const addLead = () => {
    if (!novoNome.trim()) {
      window.alert("Preencha o nome do lead.");
      return;
    }
    setLeads((prev) => [
      ...prev,
      {
        id: `l-${Date.now()}`,
        nome: novoNome.trim(),
        tel: novoTel.trim(),
        acaoId: novoAcao,
        corretor: novoCorretor.trim(),
        status: "Novo",
        data: todayBr(),
        validated: false,
      },
    ]);
    setNovoNome("");
    setNovoTel("");
    setNovoAcao("");
    setNovoCorretor("");
  };

  const updateStatus = (id: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status, validated: false } : l)));
  };

  const validateLead = (id: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, validated: true } : l)));
  };

  const validateAllLeads = () => {
    setLeads((prev) => prev.map((l) => ({ ...l, validated: true })));
  };

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const updateRoi = (id: string, field: "custo" | "custoReal", value: number) => {
    setRoi((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, validated: false } : r)),
    );
  };

  const validateRoi = (id: string) => {
    setRoi((prev) => prev.map((r) => (r.id === id ? { ...r, validated: true } : r)));
  };

  const validateAllRoi = () => {
    setRoi((prev) => prev.map((r) => ({ ...r, validated: true })));
  };

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

      <div className="ob-grid">
        <section className="ob-card" data-accent="amber">
          <header className="ob-card-head">
            <span className="ob-card-ico" data-accent="amber" aria-hidden>
              <Upload size={20} strokeWidth={1.75} />
            </span>
            <div>
              <div className="ob-card-title">Importar leads</div>
              <div className="ob-card-sub">Vincule a planilha à ação correspondente.</div>
            </div>
          </header>
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="field-label">Vincular à ação</span>
            <select className="field-input">
              <option value="">— Selecione a ação —</option>
              {ACOES_MOCK.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="upload-drop">
            <input type="file" accept=".xlsx,.xls,.csv" />
            <Upload size={20} strokeWidth={1.75} />
            <strong>Importar planilha</strong>
            <span>XLSX, XLS ou CSV</span>
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
              />
            </label>
            <label className="field">
              <span className="field-label">Telefone</span>
              <input
                className="field-input"
                value={novoTel}
                onChange={(e) => setNovoTel(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </label>
            <label className="field">
              <span className="field-label">Ação</span>
              <select
                className="field-input"
                value={novoAcao}
                onChange={(e) => setNovoAcao(e.target.value)}
              >
                <option value="">— Selecione —</option>
                {ACOES_MOCK.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Corretor</span>
              <input
                className="field-input"
                value={novoCorretor}
                onChange={(e) => setNovoCorretor(e.target.value)}
                placeholder="Nome do corretor"
              />
            </label>
          </div>
          <button type="button" className="btn btn--primary btn--full" onClick={addLead}>
            <Plus size={15} strokeWidth={2.25} /> Adicionar lead
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
          <button type="button" className="btn btn--success btn--sm" onClick={validateAllLeads}>
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
                <th>Corretor</th>
                <th>Status</th>
                <th>Data</th>
                <th>Base JV</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="data-table-empty">
                    Nenhum lead cadastrado.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id}>
                    <td className="cell-strong">{l.nome}</td>
                    <td className="cell-mute">{l.tel || "—"}</td>
                    <td>
                      <span className="chip-soft" data-accent="amber">
                        {acaoLabel(l.acaoId)}
                      </span>
                    </td>
                    <td>{l.corretor || "—"}</td>
                    <td>
                      <select
                        className="status-select"
                        value={l.status}
                        onChange={(e) => updateStatus(l.id, e.target.value as LeadStatus)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="cell-mute">{l.data}</td>
                    <td>
                      {l.validated ? (
                        <span className="status-pill" data-state="ok">
                          <ShieldCheck size={12} strokeWidth={2} /> Salvo
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--success btn--xs"
                          onClick={() => validateLead(l.id)}
                        >
                          <Check size={12} strokeWidth={2.25} /> Validar
                        </button>
                      )}
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="icon-action icon-action--danger"
                        onClick={() => deleteLead(l.id)}
                        aria-label={`Remover ${l.nome}`}
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
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
              Conectado ao Arsenal — leads, visitas e vendas vêm do CV. Preencha os custos.
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
              {roi.map((r) => {
                const cost = r.custoReal > 0 ? r.custoReal : r.custo;
                const roiValue =
                  cost > 0 && r.vgv > 0 ? `${(((r.vgv - cost) / cost) * 100).toFixed(0)}%` : "—";
                return (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.acao}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={r.custo}
                        className="cell-input"
                        onChange={(e) => updateRoi(r.id, "custo", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={r.custoReal}
                        className="cell-input"
                        onChange={(e) => updateRoi(r.id, "custoReal", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="cell-num">{r.leads}</td>
                    <td className="cell-num">{r.visitas}</td>
                    <td className="cell-num cell-strong">{r.vendas}</td>
                    <td className="cell-num">R$ {fmt(r.vgv)}</td>
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
                          onClick={() => validateRoi(r.id)}
                        >
                          <Check size={12} strokeWidth={2.25} /> Validar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

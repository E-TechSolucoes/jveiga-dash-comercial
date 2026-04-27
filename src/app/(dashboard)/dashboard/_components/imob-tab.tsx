"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Handshake,
  Home,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

type ImobStatus = "prospect" | "visita" | "acordo" | "ativa";

type Imobiliaria = {
  id: string;
  nome: string;
  resp: string;
  tel: string;
  status: ImobStatus;
  corretores: number;
  validated: boolean;
};

const STATUS_LIST: ImobStatus[] = ["prospect", "visita", "acordo", "ativa"];

const STATUS_LABEL: Record<ImobStatus, string> = {
  prospect: "Prospect",
  visita: "Visita",
  acordo: "Acordo",
  ativa: "Ativa",
};

const FUNIL_STAGES: {
  id: ImobStatus;
  label: string;
  Icon: LucideIcon;
  accent: "sky" | "amber" | "violet" | "emerald";
}[] = [
  { id: "prospect", label: "Prospect", Icon: Search, accent: "sky" },
  { id: "visita", label: "Visita", Icon: Home, accent: "amber" },
  { id: "acordo", label: "Acordo", Icon: Handshake, accent: "violet" },
  { id: "ativa", label: "Ativa", Icon: CheckCircle2, accent: "emerald" },
];

const IMOBS_MOCK: Imobiliaria[] = [
  {
    id: "1",
    nome: "VENDEU",
    resp: "Marcos Silva",
    tel: "(11) 99999-1111",
    status: "ativa",
    corretores: 8,
    validated: true,
  },
  {
    id: "2",
    nome: "TOPX",
    resp: "Ana Paula",
    tel: "(11) 99999-2222",
    status: "ativa",
    corretores: 5,
    validated: true,
  },
  {
    id: "3",
    nome: "GRÉCIA",
    resp: "Roberto Costa",
    tel: "(11) 99999-3333",
    status: "acordo",
    corretores: 3,
    validated: false,
  },
  {
    id: "4",
    nome: "TEAM HOUSE",
    resp: "Julia Santos",
    tel: "(11) 99999-4444",
    status: "visita",
    corretores: 0,
    validated: false,
  },
];

export function ImobTab() {
  const [imobs, setImobs] = useState<Imobiliaria[]>(IMOBS_MOCK);

  const [novoNome, setNovoNome] = useState("");
  const [novoResp, setNovoResp] = useState("");
  const [novoTel, setNovoTel] = useState("");

  const counts = useMemo(() => {
    const acc: Record<ImobStatus, number> = {
      prospect: 0,
      visita: 0,
      acordo: 0,
      ativa: 0,
    };
    imobs.forEach((i) => {
      acc[i.status]++;
    });
    return acc;
  }, [imobs]);

  const totalCorretores = useMemo(() => imobs.reduce((sum, i) => sum + i.corretores, 0), [imobs]);

  const addImob = () => {
    if (!novoNome.trim()) {
      window.alert("Preencha o nome da imobiliária.");
      return;
    }
    setImobs((prev) => [
      ...prev,
      {
        id: `i-${Date.now()}`,
        nome: novoNome.trim().toUpperCase(),
        resp: novoResp.trim(),
        tel: novoTel.trim(),
        status: "prospect",
        corretores: 0,
        validated: false,
      },
    ]);
    setNovoNome("");
    setNovoResp("");
    setNovoTel("");
  };

  const setStatus = (id: string, status: ImobStatus) => {
    setImobs((prev) => prev.map((i) => (i.id === id ? { ...i, status, validated: false } : i)));
  };

  const setCorretores = (id: string, value: number) => {
    setImobs((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, corretores: Math.max(0, value), validated: false } : i,
      ),
    );
  };

  const validate = (id: string) => {
    setImobs((prev) => prev.map((i) => (i.id === id ? { ...i, validated: true } : i)));
  };

  const validateAll = () => {
    setImobs((prev) => prev.map((i) => ({ ...i, validated: true })));
  };

  const remove = (id: string) => {
    setImobs((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <>
      <section className="data-card" data-accent="violet">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <Building2 size={18} strokeWidth={2} /> Cadastrar imobiliária
            </h2>
            <p className="data-card-sub">
              Registre uma nova parceira; ela entra como <strong>prospect</strong> e avança pelo
              funil até virar <strong>ativa</strong>.
            </p>
          </div>
        </header>
        <div className="field-grid field-grid--cols-4">
          <label className="field">
            <span className="field-label">Nome</span>
            <input
              className="field-input"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: VENDEU"
            />
          </label>
          <label className="field">
            <span className="field-label">Responsável</span>
            <input
              className="field-input"
              value={novoResp}
              onChange={(e) => setNovoResp(e.target.value)}
              placeholder="Gerente"
            />
          </label>
          <label className="field">
            <span className="field-label">Telefone</span>
            <input
              className="field-input"
              value={novoTel}
              onChange={(e) => setNovoTel(e.target.value)}
              placeholder="(11) 00000-0000"
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={addImob}>
            <Plus size={15} strokeWidth={2.25} /> Adicionar
          </button>
        </div>
      </section>

      <div className="section-head">
        <div>
          <h2>
            <Sparkles size={18} strokeWidth={2} /> Funil de captação
          </h2>
          <div className="sh-sub">Status das imobiliárias parceiras</div>
        </div>
      </div>

      <div className="kpi-row">
        {FUNIL_STAGES.map((stage) => {
          const Icon = stage.Icon;
          return (
            <article key={stage.id} className="kpi" data-accent={stage.accent}>
              <div className="kpi-head">
                <div className="icon-box">
                  <Icon aria-hidden />
                </div>
                <span className="status-dot" aria-hidden />
              </div>
              <div className="kpi-val">{counts[stage.id]}</div>
              <div className="kpi-label">{stage.label}</div>
              <div className="kpi-sub">
                {counts[stage.id] === 1 ? "imobiliária" : "imobiliárias"}
              </div>
            </article>
          );
        })}
      </div>

      <div className="section-head">
        <div>
          <h2>
            <Users size={18} strokeWidth={2} /> Capacidade da rede
          </h2>
          <div className="sh-sub">Tamanho atual da rede de parceiros</div>
        </div>
      </div>

      <div className="kpi-row">
        <article className="kpi" data-accent="sky">
          <div className="kpi-head">
            <div className="icon-box">
              <Building2 aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{imobs.length}</div>
          <div className="kpi-label">Total de imobiliárias</div>
          <div className="kpi-sub">Parceiras cadastradas</div>
        </article>
        <article className="kpi" data-accent="violet">
          <div className="kpi-head">
            <div className="icon-box">
              <Users aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{totalCorretores}</div>
          <div className="kpi-label">Total de corretores</div>
          <div className="kpi-sub">Soma da rede inteira</div>
        </article>
        <article className="kpi" data-accent="emerald">
          <div className="kpi-head">
            <div className="icon-box">
              <CheckCircle2 aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{counts.ativa}</div>
          <div className="kpi-label">Imobiliárias ativas</div>
          <div className="kpi-sub">Trazendo leads agora</div>
        </article>
      </div>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">Imobiliárias ({imobs.length})</h2>
            <p className="data-card-sub">
              Atualize status e número de corretores ativos por parceira.
            </p>
          </div>
          <button type="button" className="btn btn--success btn--sm" onClick={validateAll}>
            <ShieldCheck size={14} strokeWidth={2.25} /> Validar todas
          </button>
        </header>

        {imobs.length === 0 ? (
          <div className="data-empty">Nenhuma imobiliária cadastrada ainda.</div>
        ) : (
          <ul className="imob-list">
            {imobs.map((im) => (
              <li key={im.id} className="imob-card" data-status={im.status}>
                <div className="imob-card-info">
                  <div className="imob-card-name">{im.nome}</div>
                  <div className="imob-card-meta">
                    <span>{im.resp || "—"}</span>
                    <span className="dot-sep" aria-hidden>
                      ·
                    </span>
                    <span className="imob-card-tel">{im.tel || "—"}</span>
                  </div>
                </div>

                <label className="field field--inline">
                  <span className="field-label">Corretores</span>
                  <input
                    type="number"
                    min={0}
                    className="field-input field-input--narrow"
                    value={im.corretores}
                    onChange={(e) => setCorretores(im.id, Number(e.target.value) || 0)}
                  />
                </label>

                <select
                  className="status-select status-select--lg"
                  value={im.status}
                  onChange={(e) => setStatus(im.id, e.target.value as ImobStatus)}
                  data-status={im.status}
                >
                  {STATUS_LIST.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>

                {im.validated ? (
                  <span className="status-pill" data-state="ok">
                    <ShieldCheck size={12} strokeWidth={2} /> Salvo
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--success btn--xs"
                    onClick={() => validate(im.id)}
                  >
                    <Check size={12} strokeWidth={2.25} /> Validar
                  </button>
                )}

                <button
                  type="button"
                  className="icon-action icon-action--danger"
                  onClick={() => remove(im.id)}
                  aria-label={`Remover ${im.nome}`}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

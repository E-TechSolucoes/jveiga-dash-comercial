"use client";

import { useState } from "react";
import {
  CircleDollarSign,
  Dumbbell,
  Info,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Theater,
  type LucideIcon,
} from "lucide-react";

import { ARSENAL, OBJECOES, type ObjecaoTipo } from "./arsenal-data";

type Sub = "acoes" | "treinos" | "objecoes";

const SUBS: { id: Sub; label: string; Icon: LucideIcon; variant: "emerald" | "violet" | "rose" }[] =
  [
    { id: "acoes", label: "Ações de Campo", Icon: Megaphone, variant: "emerald" },
    { id: "treinos", label: "Treinamentos", Icon: Dumbbell, variant: "violet" },
    { id: "objecoes", label: "Objeções de Venda", Icon: Theater, variant: "rose" },
  ];

const TIPO_ACCENT: Record<ObjecaoTipo, "rose" | "amber" | "violet" | "blue" | "emerald" | "pink"> =
  {
    Preço: "rose",
    Adiamento: "amber",
    Financeiro: "violet",
    Concorrência: "blue",
    Produto: "emerald",
    Segurança: "pink",
  };

export function ConhecimentoTab() {
  const [sub, setSub] = useState<Sub>("acoes");

  const acoes = ARSENAL.filter((a) => a.tipo === "acao");
  const treinos = ARSENAL.filter((a) => a.tipo === "treinamento");

  return (
    <>
      <div role="tablist" aria-label="Tipo de conhecimento" className="seg">
        {SUBS.map((s) => {
          const Icon = s.Icon;
          const active = sub === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-pressed={active}
              aria-selected={active}
              className={`seg-btn${active ? ` seg-btn--${s.variant}` : ""}`}
              onClick={() => setSub(s.id)}
            >
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
              {s.label}
            </button>
          );
        })}
      </div>

      {sub === "acoes" && (
        <>
          <div className="info-banner">
            <Info size={16} strokeWidth={2} />
            <div>
              Cada ação tem um <strong>objetivo estratégico</strong> claro. Escolha as armas certas
              para o momento do empreendimento e registre no Arsenal após executar.
            </div>
          </div>

          <div className="kn-grid">
            {acoes.map((a) => {
              const Icon = a.Icon;
              return (
                <article key={a.id} className="kn-card" data-accent={a.accent}>
                  <header className="kn-card-head">
                    <span className="kn-card-ico" data-accent={a.accent} aria-hidden>
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                    <h3 className="kn-card-title">{a.nome}</h3>
                  </header>
                  <dl className="kn-rows">
                    <div className="kn-row">
                      <dt>O que é</dt>
                      <dd>{a.descricao}</dd>
                    </div>
                    {a.custo && (
                      <div className="kn-row">
                        <dt>
                          <CircleDollarSign size={12} strokeWidth={2} /> Custo médio
                        </dt>
                        <dd className="kn-row-cost">{a.custo}</dd>
                      </div>
                    )}
                    <div className="kn-row">
                      <dt>
                        <Sparkles size={12} strokeWidth={2} /> Resultado
                      </dt>
                      <dd className="kn-row-result">{a.resultado}</dd>
                    </div>
                    <div className="kn-row">
                      <dt>Como executar</dt>
                      <dd>{a.detalhe}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </>
      )}

      {sub === "treinos" && (
        <>
          <div className="info-banner">
            <Info size={16} strokeWidth={2} />
            <div>
              <strong>Terças e quintas:</strong> treinamentos técnicos e corujões.{" "}
              <strong>Diário:</strong> treinamentos relâmpago em janelas ociosas (alvo do dia,
              duelos, sino).
            </div>
          </div>

          <div className="kn-grid">
            {treinos.map((a) => {
              const Icon = a.Icon;
              return (
                <article key={a.id} className="kn-card" data-accent={a.accent}>
                  <header className="kn-card-head">
                    <span className="kn-card-ico" data-accent={a.accent} aria-hidden>
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                    <h3 className="kn-card-title">{a.nome}</h3>
                  </header>
                  <dl className="kn-rows">
                    <div className="kn-row">
                      <dt>Dinâmica</dt>
                      <dd>{a.descricao}</dd>
                    </div>
                    <div className="kn-row">
                      <dt>
                        <Sparkles size={12} strokeWidth={2} /> Prêmio
                      </dt>
                      <dd className="kn-row-result">{a.resultado}</dd>
                    </div>
                    <div className="kn-row">
                      <dt>Como aplicar</dt>
                      <dd>{a.detalhe}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </>
      )}

      {sub === "objecoes" && (
        <>
          <div className="info-banner">
            <Info size={16} strokeWidth={2} />
            <div>
              <strong>Referência para Roleplay Objeções.</strong> Use nas terças e quintas. Corretor
              que domina essas respostas fecha mais.
            </div>
          </div>

          <div className="obj-list">
            {OBJECOES.map((o, idx) => (
              <article key={o.id} className="obj-card">
                <header className="obj-card-head">
                  <span className="obj-card-num">{idx + 1}</span>
                  <span className="obj-card-tag" data-accent={TIPO_ACCENT[o.tipo]}>
                    {o.tipo}
                  </span>
                </header>
                <div className="obj-card-quote">
                  <MessageCircle size={16} strokeWidth={1.75} />
                  <span>“{o.objecao}”</span>
                </div>
                <dl className="kn-rows">
                  <div className="kn-row">
                    <dt>Contexto</dt>
                    <dd>{o.contexto}</dd>
                  </div>
                  <div className="kn-row">
                    <dt>
                      <ShieldCheck size={12} strokeWidth={2} /> Resposta
                    </dt>
                    <dd className="obj-card-answer">{o.resposta}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

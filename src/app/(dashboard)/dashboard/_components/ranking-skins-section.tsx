"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Sword, Trophy, Users, type LucideIcon } from "lucide-react";

import { useArsenalWeek } from "@/hooks/use-arsenal";
import { weekStartFromSemana, type ArsenalBroker } from "@/lib/arsenal/api";
import type { Nivel } from "./arsenal-data";

const NIVEL_ACCENT: Record<Nivel, "blue" | "violet" | "emerald" | "amber"> = {
  Soldado: "blue",
  Capitão: "violet",
  General: "emerald",
  Lenda: "amber",
};

type SkinCtx = {
  brokers: ArsenalBroker[];
  validations: number;
};

type SkinDef = {
  nome: string;
  desc: string;
  ck: (ctx: SkinCtx) => boolean;
};

const SKINS: SkinDef[] = [
  { nome: "Arquiteto", desc: "18+ a fazer base", ck: () => false },
  { nome: "Caçador de Leads", desc: "4 canais ativos", ck: () => false },
  {
    nome: "General",
    desc: "Corretor com 100+ pts",
    ck: ({ brokers }) => brokers.some((b) => b.pts >= 100),
  },
  { nome: "Mestre Conversão", desc: "Conversão > 5%", ck: () => false },
  {
    nome: "Estrategista",
    desc: "3+ vendas",
    ck: ({ brokers }) => brokers.reduce((s, b) => s + b.vendas, 0) >= 3,
  },
  {
    nome: "Treinador Elite",
    desc: "8+ validações",
    ck: ({ validations }) => validations >= 8,
  },
  {
    nome: "Captador",
    desc: "3+ imobiliárias ativas",
    ck: ({ brokers }) => {
      const ativas = new Set(
        brokers.filter((b) => b.is_active && b.imobiliaria).map((b) => b.imobiliaria as string),
      );
      return ativas.size >= 3;
    },
  },
];

type Props = {
  semana: number;
  empreendimentoIds: number[];
};

export function RankingSkinsSection({ semana, empreendimentoIds }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const weekStart = useMemo(
    () => (mounted ? weekStartFromSemana(semana) : null),
    [mounted, semana],
  );

  // Backend single-id: usamos o primeiro empreendimento selecionado.
  const empreendimentoId = empreendimentoIds[0] ?? null;

  const weekQuery = useArsenalWeek(weekStart ?? "", empreendimentoId);
  const loading = !mounted || weekQuery.isLoading;
  const error = weekQuery.isError
    ? weekQuery.error instanceof Error
      ? weekQuery.error.message
      : "Falha ao carregar arsenal."
    : null;

  const effectiveWeek = weekStart && empreendimentoId != null ? (weekQuery.data ?? null) : null;
  const brokers = useMemo<ArsenalBroker[]>(() => effectiveWeek?.brokers ?? [], [effectiveWeek]);
  const validations = effectiveWeek?.validations ?? 0;
  const weekLabel = effectiveWeek ? effectiveWeek.week_number : semana;

  const ranked = useMemo(() => [...brokers].sort((a, b) => b.pts - a.pts), [brokers]);

  const skinCtx: SkinCtx = { brokers, validations };
  const unlockedFlags = SKINS.map((s) => s.ck(skinCtx));
  const skinsUnlocked = unlockedFlags.filter(Boolean).length;
  const skinsPct = Math.round((skinsUnlocked / SKINS.length) * 100);

  return (
    <>
      <RankingCard loading={loading} error={error} weekLabel={weekLabel} ranked={ranked} />
      <SkinsCard
        unlocked={skinsUnlocked}
        total={SKINS.length}
        pct={skinsPct}
        skins={SKINS}
        unlockedFlags={unlockedFlags}
      />
    </>
  );
}

type RankingCardProps = {
  loading: boolean;
  error: string | null;
  weekLabel: number;
  ranked: ArsenalBroker[];
};

function RankingCard({ loading, error, weekLabel, ranked }: RankingCardProps) {
  return (
    <section className="data-card" data-accent="blue">
      <header className="data-card-head">
        <div>
          <h2 className="data-card-title">
            <Trophy size={18} strokeWidth={2} /> Ranking — Semana {weekLabel}
          </h2>
          <p className="data-card-sub">
            Pontuação consolidada do arsenal: presença, treinos, indicações, visitas, pastas e
            vendas.
          </p>
        </div>
        <span className="data-card-meta">
          <Users size={13} strokeWidth={2} /> {ranked.length} corretor
          {ranked.length === 1 ? "" : "es"}
        </span>
      </header>

      <div className="data-table-wrap">
        <table className="data-table rk-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Corretor</th>
              <th>Imob.</th>
              <th title="Pontos">Pts</th>
              <th title="Indicações">Ind</th>
              <th title="Visitas">Vis</th>
              <th title="Pastas">Pas</th>
              <th title="Vendas">Ven</th>
              <th>Nível</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <RankingSkeleton />
            ) : error ? (
              <tr>
                <td colSpan={9} className="data-table-empty">
                  {error}
                </td>
              </tr>
            ) : ranked.length === 0 ? (
              <tr>
                <td colSpan={9} className="data-table-empty">
                  Cadastre corretores em Armas para ver o ranking.
                </td>
              </tr>
            ) : (
              ranked.map((b, i) => (
                <tr key={b.broker_id}>
                  <td>
                    <span className="rk-pos" data-top={i < 3 ? "true" : "false"}>
                      #{i + 1}
                    </span>
                  </td>
                  <td className="cell-strong">
                    <div className="corr-name">{b.nome}</div>
                  </td>
                  <td>
                    <span className="chip-soft" data-accent="blue">
                      {b.imobiliaria || "—"}
                    </span>
                  </td>
                  <td className="cell-num cell-strong corr-pts">{b.pts}</td>
                  <td className="cell-num">{b.ind}</td>
                  <td className="cell-num">{b.vis}</td>
                  <td className="cell-num">{b.pas}</td>
                  <td className="cell-num cell-strong">{b.vendas}</td>
                  <td>
                    <span className="nivel-badge" data-accent={NIVEL_ACCENT[b.nivel as Nivel]}>
                      {b.nivel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankingSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i}>
          <td colSpan={9} className="cell-skel">
            <div className="sk-row sk-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

type SkinsCardProps = {
  unlocked: number;
  total: number;
  pct: number;
  skins: SkinDef[];
  unlockedFlags: boolean[];
};

function SkinsCard({ unlocked, total, pct, skins, unlockedFlags }: SkinsCardProps) {
  return (
    <section className="data-card" data-accent="violet">
      <header className="data-card-head">
        <div>
          <h2 className="data-card-title">
            <Sword size={18} strokeWidth={2} /> Skins do Comercial
          </h2>
          <p className="data-card-sub">
            Conquistas desbloqueadas pela performance da operação. Cada skin libera ao bater seu
            critério.
          </p>
        </div>
        <span className="data-card-meta">
          {unlocked} / {total} desbloqueada{unlocked === 1 ? "" : "s"}
        </span>
      </header>

      <div className="sk-prog" aria-hidden>
        <div className="sk-prog-fill" style={{ width: `${pct}%` }} />
      </div>

      <ul className="skins-grid">
        {skins.map((s, i) => {
          const u = unlockedFlags[i];
          const Ico: LucideIcon = u ? Sword : Lock;
          return (
            <li key={s.nome} className="sk-mini" data-state={u ? "unlocked" : "locked"}>
              <span className="sk-mini-icon" aria-hidden>
                <Ico size={16} strokeWidth={2} />
              </span>
              <div className="sk-mini-text">
                <div className="sk-mini-name">{s.nome}</div>
                <div className="sk-mini-desc">{s.desc}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

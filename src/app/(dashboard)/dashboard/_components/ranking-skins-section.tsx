"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy, Users } from "lucide-react";

import { useArsenalWeek } from "@/hooks/use-arsenal";
import { useBrokerScores } from "@/hooks/use-dashboard";
import { weekStartFromSemana, type ArsenalBroker } from "@/lib/arsenal/api";
import { aggregateBrokerScoresByBroker, type BrokerScoreAggregate } from "@/lib/broker-scores/api";
import { nivelOf, type Nivel } from "./arsenal-data";

const NIVEL_ACCENT: Record<Nivel, "blue" | "violet" | "emerald" | "amber"> = {
  Soldado: "blue",
  Capitão: "violet",
  General: "emerald",
  Lenda: "amber",
};

type RankRow = {
  brokerId: string;
  nome: string;
  imobiliaria: string;
  pts: number;
  ind: number;
  vis: number;
  pas: number;
  vendas: number;
  nivel: Nivel;
  plantaoQtd: number;
  plantaoPontos: number;
  treinoPontos: number;
  acaoPontos: number;
};

type Props = {
  semana: number;
  empreendimentoIds: number[];
};

function addDaysIso(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Funil da semana (arsenal) — sem participações de ação. */
function funnelPts(b: Pick<ArsenalBroker, "ind" | "vis" | "pas" | "pas_aprov" | "vendas">): number {
  return b.ind * 3 + b.vis * 5 + b.pas * 10 + b.pas_aprov * 20 + b.vendas * 30;
}

function arsenalActionPts(participacoes: number): number {
  return participacoes * 5 + (participacoes >= 3 ? 10 : 0);
}

function weekPts(b: ArsenalBroker, score: BrokerScoreAggregate | undefined): number {
  if (!score) return b.pts;
  const hasScoreActions = score.treinoQtd > 0 || score.acaoQtd > 0;
  const actionPts = hasScoreActions
    ? score.treinoPontos + score.acaoPontos
    : arsenalActionPts(b.participacoes_na_semana);
  return score.plantaoPontos + actionPts + funnelPts(b);
}

function mergeRanking(
  arsenalBrokers: ArsenalBroker[],
  scoreAggs: BrokerScoreAggregate[],
): RankRow[] {
  const byId = new Map<string, RankRow>();
  const scoresById = new Map(scoreAggs.map((s) => [s.brokerId, s]));

  for (const b of arsenalBrokers) {
    const score = scoresById.get(b.broker_id);
    const pts = weekPts(b, score);
    byId.set(b.broker_id, {
      brokerId: b.broker_id,
      nome: b.nome,
      imobiliaria: b.imobiliaria || "—",
      pts,
      ind: b.ind,
      vis: b.vis,
      pas: b.pas,
      vendas: b.vendas,
      nivel: nivelOf(pts),
      plantaoQtd: score?.plantaoQtd ?? 0,
      plantaoPontos: score?.plantaoPontos ?? 0,
      treinoPontos: score?.treinoPontos ?? 0,
      acaoPontos: score?.acaoPontos ?? 0,
    });
  }

  for (const score of scoreAggs) {
    if (byId.has(score.brokerId)) continue;
    const pts = score.plantaoPontos + score.treinoPontos + score.acaoPontos;
    byId.set(score.brokerId, {
      brokerId: score.brokerId,
      nome: score.nome,
      imobiliaria: "—",
      pts,
      ind: 0,
      vis: 0,
      pas: score.pastasQtd + score.pastasAprovadasQtd,
      vendas: score.vendasQtd,
      nivel: nivelOf(pts),
      plantaoQtd: score.plantaoQtd,
      plantaoPontos: score.plantaoPontos,
      treinoPontos: score.treinoPontos,
      acaoPontos: score.acaoPontos,
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.pts - a.pts || a.nome.localeCompare(b.nome));
}

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
  const weekEnd = useMemo(() => (weekStart ? addDaysIso(weekStart, 6) : null), [weekStart]);

  // Backend single-id para o arsenal; scores agregam todos os empreendimentos.
  const empreendimentoId = empreendimentoIds[0] ?? null;

  const weekQuery = useArsenalWeek(weekStart ?? "", empreendimentoId);
  const scoresQuery = useBrokerScores(empreendimentoIds, weekStart ?? "", weekEnd ?? "");

  const loading = !mounted || weekQuery.isLoading || scoresQuery.isLoading;
  const error = weekQuery.isError
    ? weekQuery.error instanceof Error
      ? weekQuery.error.message
      : "Falha ao carregar arsenal."
    : scoresQuery.isError
      ? scoresQuery.error instanceof Error
        ? scoresQuery.error.message
        : "Falha ao carregar pontuações."
      : null;

  const effectiveWeek = weekStart && empreendimentoId != null ? (weekQuery.data ?? null) : null;
  const arsenalBrokers = useMemo<ArsenalBroker[]>(
    () => effectiveWeek?.brokers ?? [],
    [effectiveWeek],
  );
  const weekLabel = effectiveWeek ? effectiveWeek.week_number : semana;

  const scoreAggs = useMemo(
    () =>
      aggregateBrokerScoresByBroker(scoresQuery.data ?? [], {
        period: "week",
      }),
    [scoresQuery.data],
  );

  const ranked = useMemo(
    () => mergeRanking(arsenalBrokers, scoreAggs),
    [arsenalBrokers, scoreAggs],
  );

  return <RankingCard loading={loading} error={error} weekLabel={weekLabel} ranked={ranked} />;
}

type RankingCardProps = {
  loading: boolean;
  error: string | null;
  weekLabel: number;
  ranked: RankRow[];
};

function RankingCard({ loading, error, weekLabel, ranked }: RankingCardProps) {
  return (
    <section className="data-card" data-accent="blue">
      <header className="data-card-head">
        <div>
          <h2 className="data-card-title">
            <Trophy size={18} strokeWidth={2} /> Ranking dos Corretores — Semana {weekLabel}
          </h2>
          <p className="data-card-sub">
            Plantão (recepção) + treinos/ações da semana + funil (indicações, visitas, pastas e
            vendas).
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
              <th title="Pontos totais da semana">Pts</th>
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
                  Sem corretores com plantão, ações ou cadastro na semana. Marque plantão na
                  recepção ou valide ações no arsenal.
                </td>
              </tr>
            ) : (
              ranked.map((b, i) => (
                <tr key={b.brokerId}>
                  <td>
                    <span
                      className="rk-pos"
                      data-top={i < 3 ? "true" : "false"}
                      data-gold={i === 0 ? "true" : "false"}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="cell-strong">
                    <div className="corr-name">{b.nome}</div>
                  </td>
                  <td>
                    <span className="chip-soft" data-accent="blue">
                      {b.imobiliaria}
                    </span>
                  </td>
                  <td
                    className="cell-num cell-strong corr-pts"
                    title={
                      [
                        b.plantaoPontos > 0
                          ? `Plantão ${b.plantaoQtd.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} → ${b.plantaoPontos} pts`
                          : null,
                        b.treinoPontos > 0 ? `Treinos ${b.treinoPontos} pts` : null,
                        b.acaoPontos > 0 ? `Ações ${b.acaoPontos} pts` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Pontuação da semana"
                    }
                  >
                    {b.pts}
                  </td>
                  <td className="cell-num">{b.ind}</td>
                  <td className="cell-num">{b.vis}</td>
                  <td className="cell-num">{b.pas}</td>
                  <td className="cell-num cell-strong">{b.vendas}</td>
                  <td>
                    <span className="nivel-badge" data-accent={NIVEL_ACCENT[b.nivel]}>
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

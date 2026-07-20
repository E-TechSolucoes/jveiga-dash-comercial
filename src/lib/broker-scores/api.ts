import { apiFetch } from "@/lib/auth";

export type BrokerScoreStatus = "active" | "inactive" | "pending";

export type BrokerScore = {
  id: string;
  broker_id: string;
  broker_nome?: string;
  enterprise_id: number;
  scoring_date: string;
  action: string;
  points: number;
  status: BrokerScoreStatus;
  created_at: string;
  updated_at: string;
};

export type BrokerScoreDTO = BrokerScore;

export type CreateBrokerScorePayload = {
  broker_id: string;
  scoring_date: string;
  enterprise_ids: number[];
  action: string;
  points: number;
  status?: BrokerScoreStatus;
};

export type DeleteBrokerScorePayload = {
  broker_id: string;
  enterprise_id: number;
  scoring_date: string;
  action: string;
};

type CreateBrokerScoreResponse = {
  items: BrokerScore[];
};

type BrokerScoreListResponse = {
  items: BrokerScore[];
};

export type ListBrokerScoresParams = {
  empreendimentoIds: number[];
  dataInicial: string;
  dataFinal?: string;
  status?: BrokerScoreStatus;
  action?: string;
  brokerId?: string;
};

export const PLANTAO_ACTION = "plantao";
export const PLANTAO_ACTION_MORNING = "plantao-morning";
export const PLANTAO_ACTION_AFTERNOON = "plantao-afternoon";

export const TREINO_ACTIONS = new Set([
  "night-study",
  "daily-target",
  "duels",
  "bell",
  "objection-roleplay",
]);

export const ACAO_CAMPO_ACTIONS = new Set([
  "flyering",
  "lobby-outreach",
  "digital-blitz",
  "stand-event",
  "reactivation-drive",
  "sale-celebration",
]);

/** Limiares mensais (aba Corretores do dash de vendas). */
export const TREINO_MIN = 4;
export const ACAO_MIN = 4;
/** Limiares semanais (Ranking do Resumo comercial). */
export const TREINO_MIN_WEEK = 2;
export const ACAO_MIN_WEEK = 2;
export const PARTICIPATION_BONUS = 10;

/** Cada turno (manhã/tarde) vale 0,5 no plantão → 1 dia = 1,0 → 10 pts na semana. */
export const PLANTAO_WEEK_PTS_PER_UNIT = 10;

export function isPlantaoAction(action: string): boolean {
  const a = action.trim().toLowerCase();
  return a === PLANTAO_ACTION || a.startsWith("plantao-");
}

export function isTreinoAction(action: string): boolean {
  return TREINO_ACTIONS.has(action.trim().toLowerCase());
}

export function isAcaoCampoAction(action: string): boolean {
  return ACAO_CAMPO_ACTIONS.has(action.trim().toLowerCase());
}

export function participationTierPoints(
  qty: number,
  min = TREINO_MIN,
  bonus = PARTICIPATION_BONUS,
): number {
  return qty >= min ? bonus : 0;
}

/** Plantões no mês (ponderado) → pontos do ranking mensal (vendas). */
export function plantaoTierPoints(weightedQty: number): number {
  if (weightedQty < 8) return 0;
  if (weightedQty <= 11) return 25;
  if (weightedQty <= 15) return 50;
  if (weightedQty <= 19) return 80;
  return 110;
}

/** Plantões na semana (ponderado 0,5 por turno) → pontos do Ranking Resumo. */
export function plantaoWeekPoints(weightedQty: number): number {
  if (!(weightedQty > 0)) return 0;
  return Math.round(weightedQty * PLANTAO_WEEK_PTS_PER_UNIT);
}

export function listBrokerScores(
  params: ListBrokerScoresParams,
  signal?: AbortSignal,
): Promise<BrokerScore[]> {
  const qs = new URLSearchParams({
    empreendimento_ids: params.empreendimentoIds.join(","),
    data_inicial: params.dataInicial,
  });
  if (params.dataFinal) qs.set("data_final", params.dataFinal);
  if (params.status) qs.set("status", params.status);
  if (params.action) qs.set("action", params.action);
  if (params.brokerId) qs.set("broker_id", params.brokerId);

  return apiFetch<BrokerScoreListResponse>(`/api/v1/broker-scores?${qs.toString()}`, {
    signal,
  }).then((res) => (Array.isArray(res?.items) ? res.items : []));
}

export const PASTA_ABERTA_ACTION = "pasta-aberta";
export const PASTA_APROVADA_ACTION = "pasta-aprovada";
export const PASTA_APROVADA_BONUS_ACTION = "pasta-aprovada-bonus-venda";
export const VENDA_ACTION = "venda";
export const VISITA_BONUS_VENDA_ACTION = "visita-bonus-venda";

export function isPastaAction(action: string): boolean {
  return action.trim().toLowerCase() === PASTA_ABERTA_ACTION;
}

export function isPastaAprovadaAction(action: string): boolean {
  return action.trim().toLowerCase() === PASTA_APROVADA_ACTION;
}

export function isPastaAprovadaBonusAction(action: string): boolean {
  return action.trim().toLowerCase() === PASTA_APROVADA_BONUS_ACTION;
}

export function isVendaAction(action: string): boolean {
  return action.trim().toLowerCase() === VENDA_ACTION;
}

export function isVisitaBonusVendaAction(action: string): boolean {
  return action.trim().toLowerCase() === VISITA_BONUS_VENDA_ACTION;
}

export type BrokerScoreAggregate = {
  brokerId: string;
  nome: string;
  plantaoQtd: number;
  plantaoPontos: number;
  treinoQtd: number;
  treinoPontos: number;
  acaoQtd: number;
  acaoPontos: number;
  pastasQtd: number;
  pastasPontos: number;
  pastasAprovadasQtd: number;
  pastasAprovadasPontos: number;
  vendasQtd: number;
  vendasPontos: number;
};

export type AggregateBrokerScoresOptions = {
  /** `week` = Ranking Resumo · `month` = Corretores (vendas). */
  period?: "week" | "month";
};

function ensureBrokerAggregate(
  byBroker: Map<string, BrokerScoreAggregate>,
  row: BrokerScore,
): BrokerScoreAggregate {
  let cur = byBroker.get(row.broker_id);
  if (!cur) {
    cur = {
      brokerId: row.broker_id,
      nome: row.broker_nome?.trim() || "—",
      plantaoQtd: 0,
      plantaoPontos: 0,
      treinoQtd: 0,
      treinoPontos: 0,
      acaoQtd: 0,
      acaoPontos: 0,
      pastasQtd: 0,
      pastasPontos: 0,
      pastasAprovadasQtd: 0,
      pastasAprovadasPontos: 0,
      vendasQtd: 0,
      vendasPontos: 0,
    };
    byBroker.set(row.broker_id, cur);
  } else if (cur.nome === "—" && row.broker_nome?.trim()) {
    cur.nome = row.broker_nome.trim();
  }
  return cur;
}

function finalizeBrokerAggregates(
  byBroker: Map<string, BrokerScoreAggregate>,
  period: "week" | "month",
): void {
  for (const entry of byBroker.values()) {
    entry.plantaoPontos =
      period === "week" ? plantaoWeekPoints(entry.plantaoQtd) : plantaoTierPoints(entry.plantaoQtd);
    entry.treinoPontos = participationTierPoints(
      entry.treinoQtd,
      period === "week" ? TREINO_MIN_WEEK : TREINO_MIN,
    );
    entry.acaoPontos = participationTierPoints(
      entry.acaoQtd,
      period === "week" ? ACAO_MIN_WEEK : ACAO_MIN,
    );
  }
}

export function aggregateBrokerScoresByBroker(
  items: BrokerScore[],
  options?: AggregateBrokerScoresOptions,
): BrokerScoreAggregate[] {
  const period = options?.period ?? "month";
  const byBroker = new Map<string, BrokerScoreAggregate>();

  for (const row of items) {
    if (row.status !== "active") continue;

    if (isPlantaoAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.plantaoQtd += Number(row.points) || 0;
    } else if (isTreinoAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.treinoQtd += 1;
    } else if (isAcaoCampoAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.acaoQtd += 1;
    } else if (isPastaAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.pastasQtd += 1;
      cur.pastasPontos += Number(row.points) || 0;
    } else if (isPastaAprovadaAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.pastasAprovadasQtd += 1;
      cur.pastasAprovadasPontos += Number(row.points) || 0;
    } else if (isPastaAprovadaBonusAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.pastasAprovadasPontos += Number(row.points) || 0;
    } else if (isVendaAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.vendasQtd += 1;
      cur.vendasPontos += Number(row.points) || 0;
    } else if (isVisitaBonusVendaAction(row.action)) {
      const cur = ensureBrokerAggregate(byBroker, row);
      cur.vendasPontos += Number(row.points) || 0;
    }
  }

  finalizeBrokerAggregates(byBroker, period);
  return Array.from(byBroker.values());
}

export function totalScorePoints(agg: BrokerScoreAggregate): number {
  return (
    agg.plantaoPontos +
    agg.treinoPontos +
    agg.acaoPontos +
    agg.pastasPontos +
    agg.pastasAprovadasPontos +
    agg.vendasPontos
  );
}

/** Monday-based week_start (YYYY-MM-DD) + weekday 1..6 → scoring_date. */
export function scoringDateFromWeek(weekStart: string, weekday: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + (weekday - 1));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function createBrokerScore(
  payload: CreateBrokerScorePayload,
): Promise<CreateBrokerScoreResponse> {
  return apiFetch<CreateBrokerScoreResponse>(`/api/v1/broker-scores`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteBrokerScore(payload: DeleteBrokerScorePayload): Promise<null> {
  return apiFetch<null>(`/api/v1/broker-scores/delete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function isBrokerScoreConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "CONFLICT"
  );
}

function isBrokerScoreNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "NOT_FOUND"
  );
}

export async function recordBrokerScoresForParticipants(params: {
  actionSlug: string;
  weekStart: string;
  weekday: number;
  empreendimentoId: number;
  participantIds: string[];
}): Promise<void> {
  const scoring_date = scoringDateFromWeek(params.weekStart, params.weekday);
  await Promise.all(
    params.participantIds.map(async (broker_id) => {
      try {
        await createBrokerScore({
          broker_id,
          scoring_date,
          enterprise_ids: [params.empreendimentoId],
          action: params.actionSlug,
          points: 0,
        });
      } catch (err) {
        if (isBrokerScoreConflict(err)) return;
        throw err;
      }
    }),
  );
}

export async function removeBrokerScoresForParticipants(params: {
  actionSlug: string;
  weekStart: string;
  weekday: number;
  empreendimentoId: number;
  participantIds: string[];
}): Promise<void> {
  const scoring_date = scoringDateFromWeek(params.weekStart, params.weekday);
  await Promise.all(
    params.participantIds.map(async (broker_id) => {
      try {
        await deleteBrokerScore({
          broker_id,
          enterprise_id: params.empreendimentoId,
          scoring_date,
          action: params.actionSlug,
        });
      } catch (err) {
        if (isBrokerScoreNotFound(err)) return;
        throw err;
      }
    }),
  );
}

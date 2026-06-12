import { apiFetch } from "@/lib/auth";

export type BrokerScoreStatus = "active" | "inactive" | "pending";

export type BrokerScore = {
  id: string;
  broker_id: string;
  enterprise_id: number;
  scoring_date: string;
  action: string;
  points: number;
  status: BrokerScoreStatus;
  created_at: string;
  updated_at: string;
};

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

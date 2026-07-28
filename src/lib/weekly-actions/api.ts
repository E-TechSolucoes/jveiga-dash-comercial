import { apiFetch } from "@/lib/auth";
import { bumpResource } from "@/lib/dashboard/data-bus";

export type WeeklyActionCategory = "field" | "training" | "award" | "other";

export type WeeklyActionStatus = "planned" | "completed" | "not_completed" | "cancelled";

export type WeeklyActionDTO = {
  id: string;
  empreendimento_id: number;
  year: number;
  iso_week: number;
  week_label: string;
  week_start: string;
  week_end: string;
  category: WeeklyActionCategory;
  action_type: string;
  description: string | null;
  planned_date: string | null;
  objective: string | null;
  objective_type: string | null;
  status: WeeklyActionStatus;
  completed: boolean;
  achieved: number | null;
  non_completion_reason: string | null;
  local: string | null;
  validated_at: string | null;
  validated_by_user_id: string | null;
  participants: WeeklyActionParticipantDTO[];
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type WeeklyActionParticipantDTO = {
  broker_id: string;
  nome: string;
  real_estate_agency_id: string | null;
  imobiliaria: string;
  celular: string | null;
};

type WeeklyActionListResponse = {
  items: WeeklyActionDTO[];
};

export type WeeklyActionsQuery = {
  /** Atalho de um único empreendimento (legado). */
  empreendimentoId?: number;
  /** Um ou mais empreendimentos (até 3). Tem precedência sobre `empreendimentoId`. */
  empreendimentoIds?: number[];
  weekStart: string;
};

const WEEKLY_ACTIONS_MAX_ENTERPRISES = 3;

function resolveEmpreendimentoIds(query: WeeklyActionsQuery): number[] {
  const fromMulti = (query.empreendimentoIds ?? [])
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, WEEKLY_ACTIONS_MAX_ENTERPRISES);
  if (fromMulti.length > 0) return fromMulti;
  const single = query.empreendimentoId;
  if (single != null && Number.isFinite(single) && single > 0) return [single];
  return [];
}

export async function listWeeklyActions(
  query: WeeklyActionsQuery,
  signal?: AbortSignal,
): Promise<WeeklyActionDTO[]> {
  const ids = resolveEmpreendimentoIds(query);
  if (ids.length === 0) return [];
  const qs = new URLSearchParams({
    empreendimento_ids: ids.join(","),
    week_start: query.weekStart,
  });
  const res = await apiFetch<WeeklyActionListResponse>(`/api/v1/weekly-actions?${qs.toString()}`, {
    signal,
  });
  return Array.isArray(res?.items) ? res.items : [];
}

export type CreateWeeklyActionInput = {
  empreendimento_id: number;
  week_start: string;
  category: WeeklyActionCategory;
  action_type: string;
  description?: string;
  planned_date?: string;
  objective?: string;
  objective_type?: string;
  local?: string;
};

export type ObjectiveUnit = "leads" | "visitas" | "pastas" | "vendas" | "corretores";

export const OBJECTIVE_UNITS: readonly { value: ObjectiveUnit; label: string }[] = [
  { value: "leads", label: "📞 leads" },
  { value: "visitas", label: "🏠 visitas" },
  { value: "pastas", label: "📄 pastas" },
  { value: "vendas", label: "💰 vendas" },
  { value: "corretores", label: "👥 corretores" },
];

export async function createWeeklyAction(
  body: CreateWeeklyActionInput,
  signal?: AbortSignal,
): Promise<WeeklyActionDTO> {
  const result = await apiFetch<WeeklyActionDTO>("/api/v1/weekly-actions", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  bumpResource("weekly-actions");
  return result;
}

export async function deleteWeeklyAction(id: string, signal?: AbortSignal): Promise<void> {
  await apiFetch<null>(`/api/v1/weekly-actions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });
  bumpResource("weekly-actions");
}

export type UpdateWeeklyActionInput = {
  category?: WeeklyActionCategory;
  action_type?: string;
  description?: string;
  planned_date?: string;
  objective?: string;
  objective_type?: string;
  status?: WeeklyActionStatus;
  completed?: boolean;
  achieved?: number | null;
  non_completion_reason?: string;
  local?: string;
};

export async function updateWeeklyAction(
  id: string,
  body: UpdateWeeklyActionInput,
  signal?: AbortSignal,
): Promise<WeeklyActionDTO> {
  const result = await apiFetch<WeeklyActionDTO>(
    `/api/v1/weekly-actions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      signal,
    },
  );
  bumpResource("weekly-actions");
  return result;
}

export type ValidateWeeklyActionInput = {
  local?: string;
  participant_broker_ids: string[];
};

export async function validateWeeklyAction(
  id: string,
  body: ValidateWeeklyActionInput,
  signal?: AbortSignal,
): Promise<WeeklyActionDTO> {
  const result = await apiFetch<WeeklyActionDTO>(
    `/api/v1/weekly-actions/${encodeURIComponent(id)}/validate`,
    {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    },
  );
  bumpResource("weekly-actions");
  return result;
}

export async function unvalidateWeeklyAction(
  id: string,
  signal?: AbortSignal,
): Promise<WeeklyActionDTO> {
  const result = await apiFetch<WeeklyActionDTO>(
    `/api/v1/weekly-actions/${encodeURIComponent(id)}/unvalidate`,
    {
      method: "POST",
      signal,
    },
  );
  bumpResource("weekly-actions");
  return result;
}

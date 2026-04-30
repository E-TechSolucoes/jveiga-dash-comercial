import { apiFetch } from "@/lib/auth";

export type ArsenalAccent =
  | "emerald"
  | "teal"
  | "violet"
  | "amber"
  | "sky"
  | "rose"
  | "indigo"
  | "cyan"
  | "fuchsia"
  | "purple"
  | "slate";

export type ArsenalIconName =
  | "Megaphone"
  | "Sword"
  | "Smartphone"
  | "Coffee"
  | "PhoneCall"
  | "PartyPopper"
  | "GraduationCap"
  | "Target"
  | "Swords"
  | "Bell"
  | "Theater";

export type ArsenalNivel = "Soldado" | "Capitão" | "General" | "Lenda";

export type FieldActionType = "field_action" | "training";

export type FieldAction = {
  id: string;
  code: string;
  nome: string;
  descricao: string;
  resultado: string;
  custo: string | null;
  detalhe: string;
  icon_name: ArsenalIconName;
  accent: ArsenalAccent;
  type: FieldActionType;
  display_order: number;
};

export type ArsenalParticipant = {
  broker_id: string;
  nome: string;
  real_estate_agency_id: string | null;
  imobiliaria: string;
  celular: string | null;
};

export type ArsenalExecution = {
  id: string;
  action_id: string;
  week_start: string;
  weekday: number;
  local: string | null;
  is_validated: boolean;
  validated_at: string | null;
  participants: ArsenalParticipant[];
};

export type ArsenalBroker = {
  broker_id: string;
  nome: string;
  real_estate_agency_id: string | null;
  imobiliaria: string;
  celular: string | null;
  is_active: boolean;
  ind: number;
  vis: number;
  pas: number;
  pas_aprov: number;
  vendas: number;
  participacoes_na_semana: number;
  pts: number;
  nivel: ArsenalNivel;
};

export type ArsenalActionWithExecutions = {
  action: FieldAction;
  executions: (ArsenalExecution | null)[];
};

export type ArsenalWeek = {
  week_start: string;
  week_end: string;
  week_number: number;
  validations: number;
  brokers: ArsenalBroker[];
  actions: ArsenalActionWithExecutions[];
};

export type ArsenalApiError = {
  error: string;
  code?: string;
  fields?: Record<string, string[]>;
};

export function getArsenalWeek(weekStart: string, empreendimentoId: number): Promise<ArsenalWeek> {
  const qs = new URLSearchParams({
    week_start: weekStart,
    empreendimento_id: String(empreendimentoId),
  }).toString();
  return apiFetch<ArsenalWeek>(`/api/v1/arsenal/week?${qs}`);
}

export type CreateBrokerPayload = {
  empreendimento_id: number;
  week_start: string;
  nome: string;
  real_estate_agency_id?: string | null;
  celular?: string;
};

export function createFieldBroker(payload: CreateBrokerPayload) {
  return apiFetch(`/api/v1/field-brokers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type PatchBrokerPayload = Partial<{
  nome: string;
  real_estate_agency_id: string | null;
  celular: string | null;
  is_active: boolean;
}>;

export function patchFieldBroker(id: string, payload: PatchBrokerPayload): Promise<unknown> {
  return apiFetch(`/api/v1/field-brokers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFieldBroker(id: string) {
  return apiFetch(`/api/v1/field-brokers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type BrokerStatsPayload = {
  week_start: string;
  ind: number;
  vis: number;
  pas: number;
  pas_aprov: number;
  vendas: number;
};

export function putBrokerStats(brokerId: string, payload: BrokerStatsPayload) {
  return apiFetch(`/api/v1/arsenal/brokers/${encodeURIComponent(brokerId)}/stats`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type UpsertExecutionPayload = {
  local?: string | null;
  participant_brokers?: string[];
};

export type UpsertExecutionResponse = Omit<ArsenalExecution, "participants">;

export function upsertExecution(
  actionId: string,
  weekStart: string,
  weekday: number,
  payload: UpsertExecutionPayload,
): Promise<UpsertExecutionResponse> {
  return apiFetch<UpsertExecutionResponse>(
    `/api/v1/arsenal/executions/${encodeURIComponent(actionId)}/${encodeURIComponent(weekStart)}/${weekday}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function validateExecution(executionId: string) {
  return apiFetch(`/api/v1/arsenal/executions/${encodeURIComponent(executionId)}/validate`, {
    method: "POST",
  });
}

export function unvalidateExecution(executionId: string) {
  return apiFetch(`/api/v1/arsenal/executions/${encodeURIComponent(executionId)}/unvalidate`, {
    method: "POST",
  });
}

export function deleteExecution(executionId: string) {
  return apiFetch(`/api/v1/arsenal/executions/${encodeURIComponent(executionId)}`, {
    method: "DELETE",
  });
}

function todaysMondayBR(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const date = new Date(get("year"), get("month") - 1, get("day"));
  const dow = date.getDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + offsetToMonday);
  return date;
}

export function weekStartFromSemana(semana: number): string {
  const d = todaysMondayBR();
  d.setDate(d.getDate() + (semana - 1) * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoWeekNumber(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function isApiError(value: unknown): value is ArsenalApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ArsenalApiError).error === "string"
  );
}

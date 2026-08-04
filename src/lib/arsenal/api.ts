import { apiFetch } from "@/lib/auth";
import {
  reuniaoTuesdayFromSemana,
  weeklyActionsWeekStartFromReuniao,
} from "@/lib/dashboard/reuniao-week";

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
  /** id da atribuição semanal (empreendimento_weekly_field_broker). */
  weekly_id: string;
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

export function listFieldActions(): Promise<FieldAction[]> {
  return apiFetch<FieldAction[]>(`/api/v1/field-actions`);
}

export type CreateBrokerPayload = {
  nome: string;
  real_estate_agency_id?: string | null;
  celular?: string;
};

/** Corretor do cadastro global (resposta do POST /field-brokers). */
export type GlobalBroker = {
  id: string;
  nome: string;
  real_estate_agency_id: string | null;
  celular: string | null;
  is_active: boolean;
};

export function createFieldBroker(payload: CreateBrokerPayload): Promise<GlobalBroker> {
  return apiFetch<GlobalBroker>(`/api/v1/field-brokers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

/** Lista o cadastro global de corretores (para o seletor "adicionar à semana"). */
export async function listGlobalBrokers(q: string): Promise<GlobalBroker[]> {
  const qs = new URLSearchParams({ limit: "100", is_active: "true" });
  if (q.trim()) qs.set("q", q.trim());
  const res = await apiFetch<PaginatedResponse<GlobalBroker>>(
    `/api/v1/field-brokers?${qs.toString()}`,
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export type AddBrokerToWeekPayload = {
  field_broker_id: string;
  empreendimento_id: number;
  week_start: string;
};

/** Vincula um corretor global a uma semana de um empreendimento. */
export function addBrokerToWeek(payload: AddBrokerToWeekPayload) {
  return apiFetch(`/api/v1/weekly-field-brokers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Remove a atribuição semanal (não apaga o corretor global). */
export function removeBrokerFromWeek(weeklyId: string) {
  return apiFetch(`/api/v1/weekly-field-brokers/${encodeURIComponent(weeklyId)}`, {
    method: "DELETE",
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
  empreendimento_id: number;
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
  empreendimentoId: number,
  payload: UpsertExecutionPayload,
): Promise<UpsertExecutionResponse> {
  const qs = new URLSearchParams({ empreendimento_id: String(empreendimentoId) }).toString();
  return apiFetch<UpsertExecutionResponse>(
    `/api/v1/arsenal/executions/${encodeURIComponent(actionId)}/${encodeURIComponent(weekStart)}/${weekday}?${qs}`,
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

/** Hoje no fuso comercial (America/Sao_Paulo), como Date local à meia-noite. */
function todayBR(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return new Date(get("year"), get("month") - 1, get("day"));
}

/**
 * Segunda-feira âncora (`week_start` da API) da semana comercial Ter→Seg
 * deslocada por `semana` (1 = semana corrente).
 *
 * O rótulo exibido é sempre o intervalo Ter→Seg (`reuniaoWeekRangeLabel`); o
 * backend continua indexando a semana pela segunda anterior à terça de
 * abertura — mesma convenção do dash de vendas.
 */
export function weekStartFromSemana(semana: number): string {
  return weeklyActionsWeekStartFromReuniao(reuniaoTuesdayFromSemana(semana, todayBR()));
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

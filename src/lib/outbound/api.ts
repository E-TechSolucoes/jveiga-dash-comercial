import { apiFetch } from "@/lib/auth";
import type { FieldAction } from "@/lib/arsenal/api";

export type OutboundStatus = "new" | "contacted" | "scheduled" | "visited" | "folder" | "sale";

export const OUTBOUND_STATUS_LABEL: Record<OutboundStatus, string> = {
  new: "Novo",
  contacted: "Contatado",
  scheduled: "Agendado",
  visited: "Visitou",
  folder: "Pasta",
  sale: "Venda",
};

export const OUTBOUND_STATUS_LIST: OutboundStatus[] = [
  "new",
  "contacted",
  "scheduled",
  "visited",
  "folder",
  "sale",
];

export type OutboundLead = {
  id: string;
  week_start: string;
  action_id: string;
  name: string;
  phone: string;
  status: OutboundStatus;
  occurred_on: string;
  validated: boolean;
  created_at: string;
  updated_at: string;
};

export type OutboundRoiRow = {
  action: FieldAction;
  cost_id: string | null;
  cost_planned: number;
  cost_real: number;
  vgv: number;
  leads: number;
  visitas: number;
  vendas: number;
  validated: boolean;
};

export type OutboundWeek = {
  week_start: string;
  leads: OutboundLead[];
  roi: OutboundRoiRow[];
};

export type OutboundCost = {
  id: string;
  week_start: string;
  action_id: string;
  cost_planned: number;
  cost_real: number;
  vgv: number;
  validated: boolean;
};

const BASE = "/api/v1/outbound";

export function getOutboundWeek(
  weekStart: string,
  empreendimentoId: number,
): Promise<OutboundWeek> {
  const qs = new URLSearchParams({
    week_start: weekStart,
    empreendimento_id: String(empreendimentoId),
  }).toString();
  return apiFetch<OutboundWeek>(`${BASE}/week?${qs}`);
}

export type CreateLeadPayload = {
  empreendimento_id: number;
  week_start: string;
  action_id: string;
  name: string;
  phone: string;
};

export function createLead(payload: CreateLeadPayload): Promise<OutboundLead> {
  return apiFetch<OutboundLead>(`${BASE}/leads`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type PatchLeadPayload = Partial<{
  name: string;
  phone: string;
  status: OutboundStatus;
  validated: boolean;
}>;

export function patchLead(id: string, payload: PatchLeadPayload): Promise<OutboundLead> {
  return apiFetch<OutboundLead>(`${BASE}/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteLead(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/leads/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function validateAllLeads(
  weekStart: string,
  empreendimentoId: number,
): Promise<{ updated: number }> {
  const qs = new URLSearchParams({
    week_start: weekStart,
    empreendimento_id: String(empreendimentoId),
  }).toString();
  return apiFetch<{ updated: number }>(`${BASE}/leads/validate-all?${qs}`, { method: "POST" });
}

export type ImportLeadsResponse = {
  imported: number;
  skipped: number;
  leads: OutboundLead[];
};

export function importLeadsSpreadsheet(args: {
  file: File;
  action_id: string;
  week_start: string;
  empreendimento_id: number;
}): Promise<ImportLeadsResponse> {
  const fd = new FormData();
  fd.append("file", args.file);
  fd.append("action_id", args.action_id);
  fd.append("week_start", args.week_start);
  fd.append("empreendimento_id", String(args.empreendimento_id));
  return apiFetch<ImportLeadsResponse>(`${BASE}/leads/import`, {
    method: "POST",
    body: fd,
  });
}

export type UpsertCostPayload = {
  empreendimento_id: number;
  week_start: string;
  action_id: string;
  cost_planned: number;
  cost_real: number;
  vgv: number;
};

export function upsertCost(payload: UpsertCostPayload): Promise<OutboundCost> {
  return apiFetch<OutboundCost>(`${BASE}/costs`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function validateCost(id: string): Promise<OutboundCost> {
  return apiFetch<OutboundCost>(`${BASE}/costs/${encodeURIComponent(id)}/validate`, {
    method: "POST",
  });
}

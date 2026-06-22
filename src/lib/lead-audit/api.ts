import { apiFetch } from "@/lib/auth";

export type LeadAuditStats = {
  total: number;
  auditados: number;
  cobertura: number;
  contato: number;
  caixa: number;
  nao_atendeu: number;
  invalido: number;
  nunca: number;
  atendido: number;
  quer: number;
  recup: number;
  redistribuir: number;
};

export type LeadAuditMeta = {
  empreendimento_id: number;
  periodo_label: string;
  periodo_start?: string;
  periodo_end?: string;
  uploaded_at?: string;
  uploaded: boolean;
  all_validated: boolean;
};

export type LeadAuditLead = {
  id: string;
  nome: string;
  tel: string;
  origem: string;
  sit: string;
  obs: string;
  liguei: string;
  wpp: string;
  atend: string;
  contato: string;
  quer: string;
  conectei: string;
  lead_date?: string;
  validated: boolean;
  external_lead_id?: number;
};

export type LeadAuditDTO = {
  meta: LeadAuditMeta;
  stats: LeadAuditStats;
  leads: LeadAuditLead[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type LeadAuditFieldOptions = {
  liguei: string[];
  wpp: string[];
  contato: string[];
  quer: string[];
  conectei: string[];
};

export const LEAD_AUDIT_PAGE_SIZE = 30;

const BASE = "/api/v1/lead-audit";

export function getLeadAudit(
  empreendimentoId: number,
  page = 1,
  limit = LEAD_AUDIT_PAGE_SIZE,
  signal?: AbortSignal,
): Promise<LeadAuditDTO> {
  const qs = new URLSearchParams({
    empreendimento_id: String(empreendimentoId),
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<LeadAuditDTO>(`${BASE}?${qs.toString()}`, { signal });
}

export function getLeadAuditFieldOptions(signal?: AbortSignal): Promise<LeadAuditFieldOptions> {
  return apiFetch<LeadAuditFieldOptions>(`${BASE}/field-options`, { signal });
}

export function importLeadAuditSpreadsheet(args: {
  file: File;
  empreendimento_id: number;
}): Promise<{ imported: number; periodo_label: string }> {
  const fd = new FormData();
  fd.append("file", args.file);
  fd.append("empreendimento_id", String(args.empreendimento_id));
  return apiFetch(`${BASE}/import`, { method: "POST", body: fd });
}

export type PatchLeadAuditPayload = {
  liguei?: string;
  wpp?: string;
  atend?: string;
  contato?: string;
  quer?: string;
  conectei?: string;
  obs?: string;
};

export function patchLeadAuditLead(
  id: string,
  payload: PatchLeadAuditPayload,
): Promise<LeadAuditLead> {
  return apiFetch<LeadAuditLead>(`${BASE}/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function validateAllLeadAudit(empreendimentoId: number): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>(`${BASE}/validate-all`, {
    method: "POST",
    body: JSON.stringify({ empreendimento_id: empreendimentoId }),
  });
}

export function isLeadRedistribuir(lead: LeadAuditLead): boolean {
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  return fold(lead.contato) === "nao" && fold(lead.quer) === "sim";
}

export function ligueiColor(liguei: string): string | undefined {
  const map: Record<string, string> = {
    Sim: "#15803d",
    "Caixa postal": "#f59e0b",
    "Não atendeu": "#ef4444",
    "Número errado": "#ef4444",
  };
  return map[liguei];
}

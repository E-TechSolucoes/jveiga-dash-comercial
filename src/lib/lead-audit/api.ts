import { apiFetch } from "@/lib/auth";

export type LeadAuditStats = {
  total: number;
  auditados: number;
  cobertura: number;
  contato: number;
  respondeu: number;
  nao_resp: number;
  caixa: number;
  nao_atendeu: number;
  invalido: number;
  bem: number;
  mal: number;
  nunca: number;
  atendido: number;
  quer: number;
  sem_inter: number;
  recup: number;
  prioridade: number;
  redistribuir: number;
  tx_valido: number;
  tx_atend: number;
  tx_quer: number;
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
  nome?: string;
  tel?: string;
  origem?: string;
  sit?: string;
  obs?: string;
  liguei?: string;
  wpp?: string;
  atend?: string;
  contato?: string;
  quer?: string;
  conectei?: string;
  lead_date?: string;
};

export type CreateLeadAuditPayload = {
  empreendimento_id: number;
  nome: string;
  tel?: string;
  origem?: string;
  sit?: string;
  obs?: string;
  lead_date?: string;
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

export function createLeadAuditLead(payload: CreateLeadAuditPayload): Promise<LeadAuditLead> {
  return apiFetch<LeadAuditLead>(`${BASE}/leads`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteLeadAuditLead(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function validateAllLeadAudit(empreendimentoId: number): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>(`${BASE}/validate-all`, {
    method: "POST",
    body: JSON.stringify({ empreendimento_id: empreendimentoId }),
  });
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function hasAny(s: string, needles: string[]): boolean {
  const f = fold(s);
  return needles.some((n) => f.includes(n));
}

export type LeadAttClass = "bem" | "mal" | "nunca";

/** Same rules as auditModel()/attClass() in Dashboard_Comercial_JV_v3.html */
export function leadAttClass(lead: Pick<LeadAuditLead, "contato" | "atend">): LeadAttClass {
  if (fold(lead.contato) === "nao") return "nunca";
  if (
    hasAny(lead.atend, [
      "mal",
      "ruim",
      "nao gost",
      "demor",
      "sem retorno",
      "nao retorn",
      "horr",
      "pess",
      "reclam",
      "sumiu",
      "ningu",
    ])
  ) {
    return "mal";
  }
  return "bem";
}

export function isLeadRespondeu(lead: Pick<LeadAuditLead, "liguei" | "wpp" | "sit">): boolean {
  const invalido =
    hasAny(lead.liguei, ["errado", "invalid", "nao existe"]) || hasAny(lead.sit, ["descart"]);
  if (invalido) return false;
  return (
    fold(lead.liguei) === "sim" || hasAny(lead.liguei, ["retornar"]) || fold(lead.wpp) === "sim"
  );
}

/** Prioridade = quer conhecer + (mal ou nunca atendido) — HTML "recuperar com prioridade" */
export function isLeadPrioridade(lead: LeadAuditLead): boolean {
  if (!isLeadRespondeu(lead)) return false;
  if (fold(lead.quer) !== "sim") return false;
  const att = leadAttClass(lead);
  return att === "nunca" || att === "mal";
}

/** @deprecated use isLeadPrioridade */
export function isLeadRedistribuir(lead: LeadAuditLead): boolean {
  return isLeadPrioridade(lead);
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

export function thc(pct: number, good = 70, amber = 50): string {
  if (pct >= good) return "#15803d";
  if (pct >= amber) return "#f59e0b";
  return "#ef4444";
}

/** Normalize partial/legacy stats payloads from older API builds. */
export function normalizeLeadAuditStats(raw: Partial<LeadAuditStats> | undefined): LeadAuditStats {
  const total = raw?.total ?? 0;
  const auditados = raw?.auditados ?? total;
  const respondeu = raw?.respondeu ?? raw?.contato ?? 0;
  const bem = raw?.bem ?? raw?.atendido ?? 0;
  const mal = raw?.mal ?? 0;
  const nunca = raw?.nunca ?? 0;
  const quer = raw?.quer ?? 0;
  const prioridade = raw?.prioridade ?? raw?.redistribuir ?? 0;
  const txValido = raw?.tx_valido ?? (auditados ? Math.round((respondeu / auditados) * 100) : 0);
  const txAtend = raw?.tx_atend ?? (respondeu ? Math.round((bem / respondeu) * 100) : 0);
  const txQuer = raw?.tx_quer ?? (respondeu ? Math.round((quer / respondeu) * 100) : 0);
  return {
    total,
    auditados,
    cobertura: raw?.cobertura ?? (auditados && total ? Math.round((auditados / total) * 100) : 0),
    contato: raw?.contato ?? respondeu,
    respondeu,
    nao_resp: raw?.nao_resp ?? 0,
    caixa: raw?.caixa ?? 0,
    nao_atendeu: raw?.nao_atendeu ?? 0,
    invalido: raw?.invalido ?? 0,
    bem,
    mal,
    nunca,
    atendido: raw?.atendido ?? bem,
    quer,
    sem_inter: raw?.sem_inter ?? Math.max(0, respondeu - quer),
    recup: raw?.recup ?? 0,
    prioridade,
    redistribuir: raw?.redistribuir ?? prioridade,
    tx_valido: txValido,
    tx_atend: txAtend,
    tx_quer: txQuer,
  };
}

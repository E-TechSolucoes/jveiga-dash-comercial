import { apiFetch } from "@/lib/auth";

export type RealEstateAgencyStatus = "prospect" | "visit" | "agreement" | "active";

export type RealEstateAgency = {
  id: string;
  name: string;
  responsible: string;
  phone: string;
  status: RealEstateAgencyStatus;
  /** Derivado no backend: nº de field brokers vinculados. Somente leitura. */
  broker_count: number;
  validated: boolean;
  created_at: string;
  updated_at: string;
};

/** Corretor de campo do cadastro global. */
export type FieldBroker = {
  id: string;
  nome: string;
  real_estate_agency_id: string | null;
  celular: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ImobStatusUI = "prospect" | "visita" | "acordo" | "ativa";

export const STATUS_API_TO_UI: Record<RealEstateAgencyStatus, ImobStatusUI> = {
  prospect: "prospect",
  visit: "visita",
  agreement: "acordo",
  active: "ativa",
};

export const STATUS_UI_TO_API: Record<ImobStatusUI, RealEstateAgencyStatus> = {
  prospect: "prospect",
  visita: "visit",
  acordo: "agreement",
  ativa: "active",
};

const BASE = "/api/v1/real-estate-agencies";

export type CreateAgencyPayload = {
  name: string;
  responsible: string;
  phone: string;
};

export type PatchAgencyPayload = Partial<{
  name: string;
  responsible: string;
  phone: string;
  status: RealEstateAgencyStatus;
  validated: boolean;
}>;

/**
 * Lista imobiliárias. Sem argumento → catálogo global completo. Com
 * `empreendimentoId` → apenas as imobiliárias vinculadas àquele empreendimento
 * (vínculo derivado das reservas no CVDW, no backend).
 */
export function listAgencies(empreendimentoId?: number): Promise<RealEstateAgency[]> {
  const url =
    empreendimentoId == null
      ? BASE
      : `${BASE}?${new URLSearchParams({ empreendimento_id: String(empreendimentoId) })}`;
  return apiFetch<RealEstateAgency[]>(url);
}

export function createAgency(payload: CreateAgencyPayload): Promise<RealEstateAgency> {
  return apiFetch<RealEstateAgency>(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchAgency(id: string, payload: PatchAgencyPayload): Promise<RealEstateAgency> {
  return apiFetch<RealEstateAgency>(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAgency(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function validateAllAgencies(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>(`${BASE}/validate-all`, { method: "POST" });
}

type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

/** Lista os field brokers vinculados a uma imobiliária (cadastro global). */
export async function getAgencyFieldBrokers(agencyId: string): Promise<FieldBroker[]> {
  const qs = new URLSearchParams({ agency_id: agencyId, limit: "100" });
  const res = await apiFetch<PaginatedResponse<FieldBroker>>(
    `/api/v1/field-brokers?${qs.toString()}`,
  );
  return Array.isArray(res?.data) ? res.data : [];
}

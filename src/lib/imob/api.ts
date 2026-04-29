import { apiFetch } from "@/lib/auth";

export type RealEstateAgencyStatus = "prospect" | "visit" | "agreement" | "active";

export type RealEstateAgency = {
  id: string;
  name: string;
  responsible: string;
  phone: string;
  status: RealEstateAgencyStatus;
  broker_count: number;
  validated: boolean;
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
  broker_count: number;
  validated: boolean;
}>;

export function listAgencies(): Promise<RealEstateAgency[]> {
  return apiFetch<RealEstateAgency[]>(BASE);
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

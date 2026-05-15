import { apiFetch } from "@/lib/auth";

export type PremiacaoAccent = "blue" | "amber" | "emerald" | "violet";

export type PremiacaoCategoryDTO = {
  id: string;
  empreendimento_id: number;
  code: string;
  categoria: string;
  criterio: string;
  valor: string;
  exemplos: string;
  regra: string;
  icon_name: string;
  accent: PremiacaoAccent;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchPremiacoesCategories(
  empreendimentoId: number,
  signal?: AbortSignal,
): Promise<PremiacaoCategoryDTO[]> {
  const qs = new URLSearchParams({ empreendimento_id: String(empreendimentoId) });
  return apiFetch<PremiacaoCategoryDTO[]>(`/api/v1/premiacoes-categories?${qs.toString()}`, {
    signal,
  });
}

export type CreatePremiacaoCategoryBody = {
  empreendimento_id: number;
  code: string;
  categoria: string;
  criterio: string;
  valor: string;
  exemplos: string;
  regra: string;
  icon_name: string;
  accent: PremiacaoAccent;
  display_order?: number;
  is_active?: boolean;
};

export async function createPremiacaoCategory(
  body: CreatePremiacaoCategoryBody,
): Promise<PremiacaoCategoryDTO> {
  return apiFetch<PremiacaoCategoryDTO>("/api/v1/premiacoes-categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type UpdatePremiacaoCategoryBody = Partial<
  Omit<CreatePremiacaoCategoryBody, "empreendimento_id">
>;

export async function updatePremiacaoCategory(
  id: string,
  body: UpdatePremiacaoCategoryBody,
): Promise<PremiacaoCategoryDTO> {
  return apiFetch<PremiacaoCategoryDTO>(`/api/v1/premiacoes-categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deletePremiacaoCategory(id: string): Promise<void> {
  await apiFetch<null>(`/api/v1/premiacoes-categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

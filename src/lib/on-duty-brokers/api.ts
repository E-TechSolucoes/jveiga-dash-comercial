import { apiFetch } from "@/lib/auth";

import type { ListOnDutyBrokersEnrichedParams, OnDutyBrokerEnrichedList } from "./types";

const BASE = "/api/v1/on-duty-brokers";

/** Fetches plantão rows enriched with corretor / imobiliária / empreendimento for
 *  the given empreendimentos over [from, to] (inclusive). The backend defaults the
 *  window to the last 14 days (America/Sao_Paulo) when from/to are omitted. Auth is
 *  the Bearer JWT attached by apiFetch — client-side only. */
export function listOnDutyBrokersEnriched(
  params: ListOnDutyBrokersEnrichedParams,
): Promise<OnDutyBrokerEnrichedList> {
  const q = new URLSearchParams();
  q.set("empreendimento_ids", params.empreendimento_ids.join(","));
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  return apiFetch<OnDutyBrokerEnrichedList>(`${BASE}/enriched?${q.toString()}`);
}

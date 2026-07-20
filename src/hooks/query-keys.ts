/** Central query-key factory for TanStack Query. Mutations invalidate by the
 * leading segment (e.g. `["arsenal-week"]`) to refresh every matching query. */
export const qk = {
  salesPlan: (year: number, month: number) => ["sales-plan", year, month] as const,
  taxas: (codigos: string, nomes: string) => ["taxas", codigos, nomes] as const,
  funil: (codigos: string, nomes: string, from: string, to: string) =>
    ["funil", codigos, nomes, from, to] as const,
  pastasKpis: (codigos: string, nomes: string, from: string, to: string) =>
    ["pastas-kpis", codigos, nomes, from, to] as const,
  pastasList: (
    codigos: string,
    nomes: string,
    from: string,
    to: string,
    page: number,
    filters: string,
  ) => ["pastas-list", codigos, nomes, from, to, page, filters] as const,
  recep: (nomes: string) => ["recep", nomes] as const,
  onDutyEnriched: (ids: string, from: string, to: string) =>
    ["on-duty-enriched", ids, from, to] as const,
  conversaoHistorica: (codigo: string, nome: string) =>
    ["conversao-historica", codigo, nome] as const,

  arsenalWeek: (weekStart: string, empreendimentoId: number) =>
    ["arsenal-week", weekStart, empreendimentoId] as const,
  brokerScores: (ids: string, from: string, to: string) =>
    ["broker-scores", ids, from, to] as const,
  fieldActions: () => ["field-actions"] as const,
  agencies: () => ["agencies"] as const,
  agencyFieldBrokers: (agencyId: string) => ["agency-field-brokers", agencyId] as const,
  globalBrokers: (q: string) => ["global-brokers", q] as const,
  outboundWeek: (weekStart: string, empreendimentoId: number) =>
    ["outbound-week", weekStart, empreendimentoId] as const,
  leadAudit: (empreendimentoId: number, page: number) =>
    ["lead-audit", empreendimentoId, page] as const,

  standCheckItems: (empreendimentoIds: string) => ["stand-check-items", empreendimentoIds] as const,
  dailyCheckItems: (empreendimentoIds: string) => ["daily-check-items", empreendimentoIds] as const,
  awardCheckItems: (empreendimentoIds: string) => ["award-check-items", empreendimentoIds] as const,
  premiacoesCategories: (empreendimentoId: number) =>
    ["premiacoes-categories", empreendimentoId] as const,
} as const;

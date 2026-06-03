export type OnDutyPeriod = "morning" | "afternoon";

/** One enriched on-duty broker row (corretor de plantão) as returned by
 *  `GET /api/v1/on-duty-brokers/enriched`. `imobiliaria` / `empreendimento_nome`
 *  come back blank when the broker has no agency or the empreendimento isn't
 *  catalogued (the backend joins are LEFT). */
export interface OnDutyBrokerEnriched {
  id: string;
  empreendimento_id: number;
  empreendimento_nome?: string;
  field_broker_nome?: string;
  imobiliaria?: string;
  period: OnDutyPeriod;
  /** duty_date as YYYY-MM-DD (DATE, no timezone). */
  duty_date: string;
  /** duty_time as HH:MM:SS (TIME, local to the stand). */
  duty_time: string;
}

export interface OnDutyBrokerEnrichedList {
  items: OnDutyBrokerEnriched[];
}

export type ListOnDutyBrokersEnrichedParams = {
  empreendimento_ids: number[];
  /** Inclusive range start (YYYY-MM-DD). Omitted → backend default (hoje-14d, SP). */
  from?: string;
  /** Inclusive range end (YYYY-MM-DD). Omitted → backend default (hoje, SP). */
  to?: string;
};

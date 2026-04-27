import path from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

const PROJECT = "jeronimo-444814";
const DATASET = "dwh";
const LEADS = `\`${PROJECT}.${DATASET}.Leads\``;
const VISITAS = `\`${PROJECT}.${DATASET}.Visitas\``;
const RESERVAS = `\`${PROJECT}.${DATASET}.Reservas\``;

let client: BigQuery | null = null;

function getBigQuery(): BigQuery {
  if (!client) {
    const keyFilename =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(process.cwd(), "jeronimo-444814-29739d221cc6.json");
    client = new BigQuery({ projectId: PROJECT, keyFilename });
  }
  return client;
}

export type FunnelPeriodInput = {
  empreendimentoCodigo: string | null;
  empreendimentoNome: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
};

export type FunnelPeriodPayload = {
  leads: number;
  visitas: number;
  vendas: number;
  /** COUNT(Reservas) com data_envio_sienge preenchida, todo o histórico do empreendimento (filtro por codigo_interno). */
  vendasAcumuladoHistorico: number;
  /** Média por venda no período: soma de (valor_do_contrato − unica_pos_obra_valor) ÷ nº de vendas (mesma base de Reservas do funil). */
  ticketMedio: number;
  /** Soma no período da mesma linha usada no ticket médio. */
  vgvPeriodo: number;
  leadsMediaHistoricaMensal: number;
};

export async function fetchFunnelPeriod(input: FunnelPeriodInput): Promise<FunnelPeriodPayload> {
  const bq = getBigQuery();
  const codigo = input.empreendimentoCodigo?.trim() || null;
  const nome = input.empreendimentoNome.trim();
  const dateFrom = input.dateFrom;
  const dateTo = input.dateTo;

  const [rowsRaw] = await bq.query({
    query: `
      CREATE TEMP FUNCTION fold(s STRING) AS (
        REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\\pM', '')
      );

      WITH params AS (
        SELECT
          @codigo AS codigo,
          fold(@nome) AS nome_fold,
          DATE(@dateFrom) AS d_from,
          DATE(@dateTo) AS d_to
      ),
      leads_count AS (
        SELECT COUNT(DISTINCT l.idlead) AS n
        FROM ${LEADS} l
        CROSS JOIN params p
        WHERE DATE(SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad)) BETWEEN p.d_from AND p.d_to
          AND (
            (p.codigo IS NOT NULL AND p.codigo != '' AND l.codigointerno_empreendimento = p.codigo)
            OR (
              (p.codigo IS NULL OR p.codigo = '')
              AND fold(l.empreendimento) = p.nome_fold
            )
          )
      ),
      lead_unico_all_time AS (
        SELECT
          l.idlead,
          MIN(DATE(SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad))) AS primeira_data
        FROM ${LEADS} l
        CROSS JOIN params p
        WHERE (
          CASE
            WHEN p.codigo IS NOT NULL AND p.codigo != '' THEN TRIM(l.codigointerno_empreendimento) = TRIM(p.codigo)
            ELSE fold(l.empreendimento) = p.nome_fold
          END
        )
          AND SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad) IS NOT NULL
        GROUP BY l.idlead
      ),
      leads_por_mes_hist AS (
        SELECT
          DATE_TRUNC(primeira_data, MONTH) AS mes_ref,
          COUNT(*) AS leads_mes
        FROM lead_unico_all_time
        GROUP BY mes_ref
      ),
      leads_media_historica AS (
        SELECT
          SAFE_DIVIDE(
            SUM(leads_mes),
            NULLIF(COUNT(*), 0)
          ) AS media_mensal
        FROM leads_por_mes_hist
      ),
      visitas_count AS (
        SELECT COUNT(*) AS n
        FROM ${VISITAS} v
        CROSS JOIN params p
        WHERE DATE(
          COALESCE(
            SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(v.data), '')),
            DATE(v.created_at_utc)
          )
        ) BETWEEN p.d_from AND p.d_to
          AND fold(v.empreendimento) = p.nome_fold
      ),
      vendas_periodo AS (
        SELECT
          DATETIME(r.data_envio_sienge) AS dt_envio,
          IFNULL(r.valor_do_contrato, 0) - IFNULL(r.unica_pos_obra_valor, 0) AS vgv_linha
        FROM ${RESERVAS} r
        CROSS JOIN params p
        WHERE r.data_envio_sienge IS NOT NULL
          AND DATE(DATETIME(r.data_envio_sienge)) BETWEEN p.d_from AND p.d_to
          AND (
            (p.codigo IS NOT NULL AND p.codigo != '' AND TRIM(CAST(r.codigo_interno_do_empreendimento AS STRING)) = TRIM(p.codigo))
            OR (
              (p.codigo IS NULL OR p.codigo = '')
              AND fold(r.empreendimento) = p.nome_fold
            )
          )
      ),
      vendas_count AS (
        SELECT COUNT(*) AS n FROM vendas_periodo
      ),
      vendas_total_historico AS (
        SELECT COUNT(*) AS n
        FROM ${RESERVAS} r
        CROSS JOIN params p
        WHERE r.data_envio_sienge IS NOT NULL
          AND (
            (p.codigo IS NOT NULL AND p.codigo != '' AND TRIM(CAST(r.codigo_interno_do_empreendimento AS STRING)) = TRIM(p.codigo))
            OR (
              (p.codigo IS NULL OR p.codigo = '')
              AND fold(r.empreendimento) = p.nome_fold
            )
          )
      ),
      vgv_ticket_periodo AS (
        SELECT
          SUM(v.vgv_linha) AS vgv_periodo,
          SAFE_DIVIDE(SUM(v.vgv_linha), NULLIF(COUNT(*), 0)) AS ticket_medio
        FROM vendas_periodo v
      )
      SELECT
        (SELECT n FROM leads_count) AS leads,
        (SELECT n FROM visitas_count) AS visitas,
        (SELECT n FROM vendas_count) AS vendas,
        (SELECT n FROM vendas_total_historico) AS vendas_acumulado_historico,
        (SELECT ticket_medio FROM vgv_ticket_periodo) AS ticket_medio,
        (SELECT vgv_periodo FROM vgv_ticket_periodo) AS vgv_periodo,
        (SELECT media_mensal FROM leads_media_historica) AS leads_media_historica_mensal
    `,
    params: {
      codigo,
      nome,
      dateFrom,
      dateTo,
    },
  });

  const row = (
    rowsRaw as Array<{
      leads: number | string;
      visitas: number | string;
      vendas: number | string;
      vendas_acumulado_historico: number | string;
      ticket_medio: number | string | null;
      vgv_periodo: number | string | null;
      leads_media_historica_mensal: number | string | null;
    }>
  )[0];
  return {
    leads: Number(row?.leads ?? 0),
    visitas: Number(row?.visitas ?? 0),
    vendas: Number(row?.vendas ?? 0),
    vendasAcumuladoHistorico: Number(row?.vendas_acumulado_historico ?? 0),
    ticketMedio: Number(row?.ticket_medio ?? 0),
    vgvPeriodo: Number(row?.vgv_periodo ?? 0),
    leadsMediaHistoricaMensal: Number(row?.leads_media_historica_mensal ?? 0),
  };
}

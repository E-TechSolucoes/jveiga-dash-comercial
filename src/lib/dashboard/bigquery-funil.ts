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
  /** IDs numéricos dos empreendimentos selecionados que possuem ID. */
  empreendimentoCodigos: number[];
  /** Nomes (catálogo) dos empreendimentos selecionados — folded server-side. */
  empreendimentoNomes: string[];
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
};

export type FunnelPeriodPayload = {
  leads: number;
  visitas: number;
  vendas: number;
  /** COUNT(Reservas) com data_envio_sienge preenchida, todo o histórico do empreendimento (filtro por idempreendimento/empreendimento). */
  vendasAcumuladoHistorico: number;
  /** Média por venda no período: soma de (valor_do_contrato − unica_pos_obra_valor) ÷ nº de vendas (mesma base de Reservas do funil). */
  ticketMedio: number;
  /** Soma no período da mesma linha usada no ticket médio. */
  vgvPeriodo: number;
  leadsMediaHistoricaMensal: number;
};

function foldClient(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{M}/gu, "").toUpperCase().trim();
}

export async function fetchFunnelPeriod(input: FunnelPeriodInput): Promise<FunnelPeriodPayload> {
  const bq = getBigQuery();
  const ids = (input.empreendimentoCodigos ?? []).filter((n) => Number.isFinite(n));
  const nomes = (input.empreendimentoNomes ?? []).map(foldClient).filter((s) => s.length > 0);
  const dateFrom = input.dateFrom;
  const dateTo = input.dateTo;
  // Sentinelas garantem arrays não vazios (BQ exige tipagem para arrays vazios).
  const idsParam = ids.length > 0 ? ids : [-1];
  const nomesParam = nomes.length > 0 ? nomes : ["__NEVER_MATCH__"];

  console.error("[funil] params", { ids, nomes, dateFrom, dateTo });

  let rowsRaw: unknown[];
  try {
    [rowsRaw] = await bq.query({
      query: `
      CREATE TEMP FUNCTION fold(s STRING) AS (
        REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\\pM', '')
      );

      -- Vendas no período: data de corte exclusivamente coluna data_envio_sienge (Sienge/BQ).
      CREATE TEMP FUNCTION data_envio_sienge_para_date(x ANY TYPE) AS (
        DATE(
          COALESCE(
            SAFE_CAST(x AS DATETIME),
            DATETIME(SAFE_CAST(x AS TIMESTAMP)),
            SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', NULLIF(TRIM(CAST(x AS STRING)), '')),
            SAFE.PARSE_DATETIME('%Y-%m-%d', NULLIF(TRIM(CAST(x AS STRING)), '')),
            SAFE.PARSE_DATETIME('%d/%m/%Y %H:%M:%S', NULLIF(TRIM(CAST(x AS STRING)), '')),
            DATETIME(SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(CAST(x AS STRING)), '')), TIME(0, 0, 0))
          )
        )
      );

      WITH params AS (
        SELECT
          @ids AS ids,
          @nomes_fold AS nomes_fold,
          DATE(@dateFrom) AS d_from,
          DATE(@dateTo) AS d_to
      ),
      leads_count AS (
        SELECT COUNT(DISTINCT l.idlead) AS n
        FROM ${LEADS} l
        CROSS JOIN params p
        WHERE DATE(SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad)) BETWEEN p.d_from AND p.d_to
          AND (
            SAFE_CAST(TRIM(CAST(l.codigointerno_empreendimento AS STRING)) AS INT64) IN UNNEST(p.ids)
            OR fold(l.empreendimento) IN UNNEST(p.nomes_fold)
          )
      ),
      lead_unico_all_time AS (
        SELECT
          l.idlead,
          MIN(DATE(SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad))) AS primeira_data
        FROM ${LEADS} l
        CROSS JOIN params p
        WHERE (
            SAFE_CAST(TRIM(CAST(l.codigointerno_empreendimento AS STRING)) AS INT64) IN UNNEST(p.ids)
            OR fold(l.empreendimento) IN UNNEST(p.nomes_fold)
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
          AND fold(v.empreendimento) IN UNNEST(p.nomes_fold)
      ),
      vendas_periodo AS (
        SELECT
          COALESCE(
            SAFE_CAST(r.data_envio_sienge AS DATETIME),
            DATETIME(SAFE_CAST(r.data_envio_sienge AS TIMESTAMP)),
            SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', NULLIF(TRIM(CAST(r.data_envio_sienge AS STRING)), '')),
            SAFE.PARSE_DATETIME('%Y-%m-%d', NULLIF(TRIM(CAST(r.data_envio_sienge AS STRING)), '')),
            SAFE.PARSE_DATETIME('%d/%m/%Y %H:%M:%S', NULLIF(TRIM(CAST(r.data_envio_sienge AS STRING)), '')),
            DATETIME(SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(CAST(r.data_envio_sienge AS STRING)), '')), TIME(0, 0, 0))
          ) AS dt_envio,
          IFNULL(r.valor_do_contrato, 0) - IFNULL(r.unica_pos_obra_valor, 0) AS vgv_linha
        FROM ${RESERVAS} r
        CROSS JOIN params p
        WHERE r.data_envio_sienge IS NOT NULL
          AND data_envio_sienge_para_date(r.data_envio_sienge) BETWEEN p.d_from AND p.d_to
          AND (
            SAFE_CAST(TRIM(CAST(r.codigo_interno_do_empreendimento AS STRING)) AS INT64) IN UNNEST(p.ids)
            OR fold(r.empreendimento) IN UNNEST(p.nomes_fold)
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
            SAFE_CAST(TRIM(CAST(r.codigo_interno_do_empreendimento AS STRING)) AS INT64) IN UNNEST(p.ids)
            OR fold(r.empreendimento) IN UNNEST(p.nomes_fold)
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
        ids: idsParam,
        nomes_fold: nomesParam,
        dateFrom,
        dateTo,
      },
      types: {
        ids: ["INT64"],
        nomes_fold: ["STRING"],
        dateFrom: "STRING",
        dateTo: "STRING",
      },
    });
  } catch (err) {
    console.error("[funil] BQ error", { ids, nomes, dateFrom, dateTo, error: err });
    throw err;
  }

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
  const result = {
    leads: Number(row?.leads ?? 0),
    visitas: Number(row?.visitas ?? 0),
    vendas: Number(row?.vendas ?? 0),
    vendasAcumuladoHistorico: Number(row?.vendas_acumulado_historico ?? 0),
    ticketMedio: Number(row?.ticket_medio ?? 0),
    vgvPeriodo: Number(row?.vgv_periodo ?? 0),
    leadsMediaHistoricaMensal: Number(row?.leads_media_historica_mensal ?? 0),
  };
  console.error("[funil] result", { ids, nomes, ...result });
  return result;
}

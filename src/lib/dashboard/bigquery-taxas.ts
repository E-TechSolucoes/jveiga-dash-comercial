import path from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

const PROJECT = "jeronimo-444814";
const DATASET = "dwh";
const LEADS = `\`${PROJECT}.${DATASET}.Leads\``;
const VISITAS = `\`${PROJECT}.${DATASET}.Visitas\``;
const PASTAS = `\`${PROJECT}.${DATASET}.Pastas\``;
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

export type TaxasInput = {
  empreendimentoCodigos: number[];
  empreendimentoNomes: string[];
};

export type TaxasPayload = {
  totals: {
    leads: number;
    visitas: number;
    pastas: number;
    vendas: number;
  };
  taxas: {
    lv: number; // visitas / leads
    vp: number; // pastas / visitas
    pv: number; // vendas / pastas
  };
};

function foldClient(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{M}/gu, "").toUpperCase().trim();
}

function safeRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

/**
 * Histórico acumulado por empreendimento, sem filtro de data. As taxas saem de
 * `próxima_etapa / etapa_anterior` (lv = visitas/leads, vp = pastas/visitas,
 * pv = vendas/pastas) e refletem o pipeline real — substituindo a estimativa
 * fixa 15 / 20 / 50 % usada antes na Cascata.
 */
export async function fetchHistoricalTaxas(input: TaxasInput): Promise<TaxasPayload> {
  const bq = getBigQuery();
  const ids = (input.empreendimentoCodigos ?? []).filter((n) => Number.isFinite(n));
  const nomes = (input.empreendimentoNomes ?? []).map(foldClient).filter((s) => s.length > 0);
  const idsParam = ids.length > 0 ? ids : [-1];
  const nomesParam = nomes.length > 0 ? nomes : ["__NEVER_MATCH__"];

  const [rowsRaw] = await bq.query({
    query: `
      CREATE TEMP FUNCTION fold(s STRING) AS (
        REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\\pM', '')
      );

      WITH params AS (
        SELECT @ids AS ids, @nomes_fold AS nomes_fold
      ),
      leads_total AS (
        SELECT COUNT(DISTINCT l.idlead) AS n
        FROM ${LEADS} l
        CROSS JOIN params pr
        WHERE (
          SAFE_CAST(TRIM(CAST(l.codigointerno_empreendimento AS STRING)) AS INT64) IN UNNEST(pr.ids)
          OR fold(l.empreendimento) IN UNNEST(pr.nomes_fold)
        )
      ),
      visitas_total AS (
        SELECT COUNT(*) AS n
        FROM ${VISITAS} v
        CROSS JOIN params pr
        WHERE (
          SAFE_CAST(TRIM(CAST(v.empreendimento_id AS STRING)) AS INT64) IN UNNEST(pr.ids)
          OR fold(v.empreendimento) IN UNNEST(pr.nomes_fold)
        )
      ),
      pastas_total AS (
        SELECT COUNT(*) AS n
        FROM ${PASTAS} p
        CROSS JOIN params pr
        WHERE (
          SAFE_CAST(TRIM(CAST(p.idempreendimento AS STRING)) AS INT64) IN UNNEST(pr.ids)
          OR fold(p.empreendimento) IN UNNEST(pr.nomes_fold)
        )
      ),
      vendas_total AS (
        SELECT COUNT(*) AS n
        FROM ${RESERVAS} r
        CROSS JOIN params pr
        WHERE r.data_envio_sienge IS NOT NULL
          AND (
            SAFE_CAST(TRIM(CAST(r.codigo_interno_do_empreendimento AS STRING)) AS INT64) IN UNNEST(pr.ids)
            OR fold(r.empreendimento) IN UNNEST(pr.nomes_fold)
          )
      )
      SELECT
        (SELECT n FROM leads_total) AS leads,
        (SELECT n FROM visitas_total) AS visitas,
        (SELECT n FROM pastas_total) AS pastas,
        (SELECT n FROM vendas_total) AS vendas
    `,
    params: { ids: idsParam, nomes_fold: nomesParam },
    types: { ids: ["INT64"], nomes_fold: ["STRING"] },
  });

  const row = (
    rowsRaw as Array<{
      leads: number | string;
      visitas: number | string;
      pastas: number | string;
      vendas: number | string;
    }>
  )[0];

  const totals = {
    leads: Number(row?.leads ?? 0),
    visitas: Number(row?.visitas ?? 0),
    pastas: Number(row?.pastas ?? 0),
    vendas: Number(row?.vendas ?? 0),
  };

  return {
    totals,
    taxas: {
      lv: safeRate(totals.visitas, totals.leads),
      vp: safeRate(totals.pastas, totals.visitas),
      pv: safeRate(totals.vendas, totals.pastas),
    },
  };
}

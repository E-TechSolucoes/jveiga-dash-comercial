import path from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

const PROJECT = "jeronimo-444814";
const DATASET = "dwh";
const PASTAS = `\`${PROJECT}.${DATASET}.Pastas\``;

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

export type PastasPeriodInput = {
  /** Nome do empreendimento (ex.: do header), comparado a `Pastas.empreendimento` com normalização NFD. */
  empreendimentoNome: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
};

export type PastasTotaisPayload = {
  total: number;
  emAndamento: number;
  concluidas: number;
  distratadas: number;
};

export const PASTAS_PAGE_SIZE = 8;

export type PastasPessoaItem = {
  pessoa: string;
  situacao: string;
  valorTotal: number;
  idsituacao: number | null;
  empreendimento: string;
  corretor: string;
  unidade: string;
  referenciaData: string | null;
  idPasta: string | null;
};

export type PastasListPayload = {
  total: number;
  page: number;
  pageSize: number;
  items: PastasPessoaItem[];
};

/**
 * Agrega `dwh.Pastas` por `empreendimento` (nome) e data de `referencia_data` no período.
 * `idsituacao`: 5 → Concluídas (Aprovado); 3, 6 → Distratadas (Cancelada, Reprovado); demais → Em andamento.
 */
export async function fetchPastasTotais(input: PastasPeriodInput): Promise<PastasTotaisPayload> {
  const bq = getBigQuery();
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
          fold(@nome) AS nome_fold,
          DATE(@dateFrom) AS d_from,
          DATE(@dateTo) AS d_to
      ),
      base AS (
        SELECT
          p.idsituacao AS st
        FROM ${PASTAS} p
        CROSS JOIN params pr
        WHERE fold(p.empreendimento) = pr.nome_fold
          AND p.referencia_data IS NOT NULL
          AND TRIM(p.referencia_data) != ''
          AND DATE(
            SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', NULLIF(TRIM(p.referencia_data), ''))
          ) BETWEEN pr.d_from AND pr.d_to
      ),
      bucketed AS (
        SELECT
          CASE
            WHEN st = 5 THEN 'concluidas'
            WHEN st IN (3, 6) THEN 'distratadas'
            ELSE 'andamento'
          END AS bucket
        FROM base
      )
      SELECT
        COUNT(*) AS total,
        COUNTIF(bucket = 'andamento') AS em_andamento,
        COUNTIF(bucket = 'concluidas') AS concluidas,
        COUNTIF(bucket = 'distratadas') AS distratadas
      FROM bucketed
    `,
    params: {
      nome,
      dateFrom,
      dateTo,
    },
  });

  const row = (
    rowsRaw as Array<{
      total: number | string;
      em_andamento: number | string;
      concluidas: number | string;
      distratadas: number | string;
    }>
  )[0];
  return {
    total: Number(row?.total ?? 0),
    emAndamento: Number(row?.em_andamento ?? 0),
    concluidas: Number(row?.concluidas ?? 0),
    distratadas: Number(row?.distratadas ?? 0),
  };
}

export type PastasListInput = PastasPeriodInput & {
  page: number;
  pageSize?: number;
};

const PASTAS_FILTER_CTE = `
  CREATE TEMP FUNCTION fold(s STRING) AS (
    REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\\pM', '')
  );

  WITH params AS (
    SELECT
      fold(@nome) AS nome_fold,
      DATE(@dateFrom) AS d_from,
      DATE(@dateTo) AS d_to
  ),
  filtered AS (
    SELECT
      TRIM(IFNULL(p.pessoa, '')) AS pessoa,
      TRIM(IFNULL(p.situacao, '')) AS situacao,
      IFNULL(p.valor_total, 0) AS valor_total,
      p.idsituacao AS idsituacao,
      TRIM(IFNULL(p.empreendimento, '')) AS empreendimento,
      TRIM(IFNULL(p.corretor, '')) AS corretor,
      TRIM(IFNULL(p.unidade, '')) AS unidade,
      TRIM(IFNULL(p.referencia_data, '')) AS referencia_data,
      CAST(p.idprecadastro AS STRING) AS id_pasta,
      DATE(
        SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', NULLIF(TRIM(p.referencia_data), ''))
      ) AS ref_d
    FROM ${PASTAS} p
    CROSS JOIN params pr
    WHERE fold(p.empreendimento) = pr.nome_fold
      AND p.referencia_data IS NOT NULL
      AND TRIM(p.referencia_data) != ''
      AND DATE(
        SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', NULLIF(TRIM(p.referencia_data), ''))
      ) BETWEEN pr.d_from AND pr.d_to
  )
`;

/**
 * Lista pastas (pessoa, situação, valor) com o mesmo filtro de nome/período, paginada.
 */
export async function fetchPastasPessoasPage(input: PastasListInput): Promise<PastasListPayload> {
  const bq = getBigQuery();
  const nome = input.empreendimentoNome.trim();
  const dateFrom = input.dateFrom;
  const dateTo = input.dateTo;
  const page = Math.max(1, Math.floor(Number(input.page)) || 1);
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize ?? PASTAS_PAGE_SIZE)));
  const offset = (page - 1) * pageSize;

  const baseParams = { nome, dateFrom, dateTo };

  const [countRows] = await bq.query({
    query: `
      ${PASTAS_FILTER_CTE}
      SELECT COUNT(*) AS c FROM filtered
    `,
    params: baseParams,
  });

  const total = Number((countRows as Array<{ c: number | string }>)[0]?.c ?? 0);

  if (total === 0) {
    return { total: 0, page, pageSize, items: [] };
  }

  const [rowsRaw] = await bq.query({
    query: `
      ${PASTAS_FILTER_CTE}
      SELECT
        pessoa,
        situacao,
        valor_total,
        idsituacao,
        empreendimento,
        corretor,
        unidade,
        referencia_data,
        id_pasta
      FROM filtered
      ORDER BY ref_d DESC, pessoa ASC
      LIMIT @pageSize OFFSET @offset
    `,
    params: {
      ...baseParams,
      pageSize,
      offset,
    },
  });

  const rows = rowsRaw as Array<{
    pessoa: string | null;
    situacao: string | null;
    valor_total: number | string | null;
    idsituacao: number | string | null;
    empreendimento: string | null;
    corretor: string | null;
    unidade: string | null;
    referencia_data: string | null;
    id_pasta: string | null;
  }>;

  const items: PastasPessoaItem[] = rows.map((r) => ({
    pessoa: (r.pessoa ?? "").trim() || "—",
    situacao: (r.situacao ?? "").trim() || "—",
    valorTotal: Number(r.valor_total ?? 0),
    idsituacao:
      r.idsituacao === null || r.idsituacao === undefined || r.idsituacao === ""
        ? null
        : Number(r.idsituacao),
    empreendimento: (r.empreendimento ?? "").trim() || "—",
    corretor: (r.corretor ?? "").trim() || "—",
    unidade: (r.unidade ?? "").trim(),
    referenciaData: (r.referencia_data ?? "").trim() || null,
    idPasta:
      r.id_pasta != null && String(r.id_pasta).trim() !== "" ? String(r.id_pasta).trim() : null,
  }));

  return { total, page, pageSize, items };
}

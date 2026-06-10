import path from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

const PROJECT = "jeronimo-444814";
const DATASET = "dwh";
const PASTAS = `\`${PROJECT}.${DATASET}.precadastros_completo_latest\``;

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
  /** IDs numéricos dos empreendimentos selecionados que possuem ID. */
  empreendimentoCodigos: number[];
  /** Nomes (catálogo) dos empreendimentos selecionados — comparados a `precadastros_completo_latest.empreendimento` (NFD). */
  empreendimentoNomes: string[];
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

function foldClient(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{M}/gu, "").toUpperCase().trim();
}

/**
 * Agrega `precadastros_completo_latest` por `idempreendimento`/`empreendimento`
 * (nome) e data de `referencia_data` no período. Aceita múltiplos empreendimentos via UNNEST.
 * `idsituacao`: 5 → Concluídas (Aprovado); 3, 6 → Distratadas (Cancelada, Reprovado); demais → Em andamento.
 */
export async function fetchPastasTotais(input: PastasPeriodInput): Promise<PastasTotaisPayload> {
  const bq = getBigQuery();
  const ids = (input.empreendimentoCodigos ?? []).filter((n) => Number.isFinite(n));
  const nomes = (input.empreendimentoNomes ?? []).map(foldClient).filter((s) => s.length > 0);
  const dateFrom = input.dateFrom;
  const dateTo = input.dateTo;
  const idsParam = ids.length > 0 ? ids : [-1];
  const nomesParam = nomes.length > 0 ? nomes : ["__NEVER_MATCH__"];

  console.error("[pastas] params", { ids, nomes, dateFrom, dateTo });

  let rowsRaw: unknown[];
  try {
    [rowsRaw] = await bq.query({
      query: `
      CREATE TEMP FUNCTION fold(s STRING) AS (
        REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\\pM', '')
      );

      WITH params AS (
        SELECT
          @ids AS ids,
          @nomes_fold AS nomes_fold,
          DATE(@dateFrom) AS d_from,
          DATE(@dateTo) AS d_to
      ),
      base AS (
        SELECT
          p.idsituacao AS st
        FROM ${PASTAS} p
        CROSS JOIN params pr
        WHERE (
            SAFE_CAST(TRIM(CAST(p.idempreendimento AS STRING)) AS INT64) IN UNNEST(pr.ids)
            OR fold(p.empreendimento) IN UNNEST(pr.nomes_fold)
          )
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
    console.error("[pastas] BQ error", { ids, nomes, dateFrom, dateTo, error: err });
    throw err;
  }

  const row = (
    rowsRaw as Array<{
      total: number | string;
      em_andamento: number | string;
      concluidas: number | string;
      distratadas: number | string;
    }>
  )[0];
  const result = {
    total: Number(row?.total ?? 0),
    emAndamento: Number(row?.em_andamento ?? 0),
    concluidas: Number(row?.concluidas ?? 0),
    distratadas: Number(row?.distratadas ?? 0),
  };
  console.error("[pastas] result", { ids, nomes, ...result });
  return result;
}

export type PastasListSituacao = "" | "andamento" | "concluidas" | "distratadas";

export type PastasListInput = PastasPeriodInput & {
  page: number;
  pageSize?: number;
  /** Filtros server-side opcionais aplicados na CTE `filtered`. */
  pessoa?: string;
  corretor?: string;
  empreendimento?: string;
  situacao?: string;
};

const PASTAS_FILTER_CTE = `
  CREATE TEMP FUNCTION fold(s STRING) AS (
    REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\\pM', '')
  );

  WITH params AS (
    SELECT
      @ids AS ids,
      @nomes_fold AS nomes_fold,
      DATE(@dateFrom) AS d_from,
      DATE(@dateTo) AS d_to,
      @pessoa_fold AS pessoa_fold,
      @corretor_fold AS corretor_fold,
      @emp_fold AS emp_fold,
      @situacao AS situacao
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
    WHERE (
        SAFE_CAST(TRIM(CAST(p.idempreendimento AS STRING)) AS INT64) IN UNNEST(pr.ids)
        OR fold(p.empreendimento) IN UNNEST(pr.nomes_fold)
      )
      AND (pr.pessoa_fold = '' OR fold(p.pessoa) LIKE CONCAT('%', pr.pessoa_fold, '%'))
      AND (pr.corretor_fold = '' OR fold(p.corretor) LIKE CONCAT('%', pr.corretor_fold, '%'))
      AND (pr.emp_fold = '' OR fold(p.empreendimento) = pr.emp_fold)
      AND (
        pr.situacao = ''
        OR (pr.situacao = 'concluidas'  AND p.idsituacao = 5)
        OR (pr.situacao = 'distratadas' AND p.idsituacao IN (3, 6))
        OR (pr.situacao = 'andamento'   AND (p.idsituacao IS NULL OR p.idsituacao NOT IN (3, 5, 6)))
      )
      AND p.referencia_data IS NOT NULL
      AND TRIM(p.referencia_data) != ''
      AND DATE(
        SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', NULLIF(TRIM(p.referencia_data), ''))
      ) BETWEEN pr.d_from AND pr.d_to
  )
`;

const PASTAS_FILTER_TYPES: Record<string, string | string[]> = {
  ids: ["INT64"],
  nomes_fold: ["STRING"],
  dateFrom: "STRING",
  dateTo: "STRING",
  pessoa_fold: "STRING",
  corretor_fold: "STRING",
  emp_fold: "STRING",
  situacao: "STRING",
};

/**
 * Lista pastas (pessoa, situação, valor) com o mesmo filtro de nome/período, paginada.
 */
/** Escapa curingas de LIKE (`%`, `_`, `\`) — o BigQuery usa `\` como escape no LIKE. */
function escapeLike(value: string): string {
  return value.replaceAll(/[\\%_]/g, "\\$&");
}

const PASTAS_SITUACOES = new Set(["andamento", "concluidas", "distratadas"]);

export async function fetchPastasPessoasPage(input: PastasListInput): Promise<PastasListPayload> {
  const bq = getBigQuery();
  const ids = (input.empreendimentoCodigos ?? []).filter((n) => Number.isFinite(n));
  const nomes = (input.empreendimentoNomes ?? []).map(foldClient).filter((s) => s.length > 0);
  const dateFrom = input.dateFrom;
  const dateTo = input.dateTo;
  const page = Math.max(1, Math.floor(Number(input.page)) || 1);
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize ?? PASTAS_PAGE_SIZE)));
  const offset = (page - 1) * pageSize;
  const idsParam = ids.length > 0 ? ids : [-1];
  const nomesParam = nomes.length > 0 ? nomes : ["__NEVER_MATCH__"];

  const pessoaFold = escapeLike(foldClient(input.pessoa ?? ""));
  const corretorFold = escapeLike(foldClient(input.corretor ?? ""));
  const empFold = foldClient(input.empreendimento ?? "");
  const situacao = PASTAS_SITUACOES.has((input.situacao ?? "").trim())
    ? (input.situacao ?? "").trim()
    : "";

  const baseParams = {
    ids: idsParam,
    nomes_fold: nomesParam,
    dateFrom,
    dateTo,
    pessoa_fold: pessoaFold,
    corretor_fold: corretorFold,
    emp_fold: empFold,
    situacao,
  };

  const [countRows] = await bq.query({
    query: `
      ${PASTAS_FILTER_CTE}
      SELECT COUNT(*) AS c FROM filtered
    `,
    params: baseParams,
    types: { ...PASTAS_FILTER_TYPES },
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
    types: {
      ...PASTAS_FILTER_TYPES,
      pageSize: "INT64",
      offset: "INT64",
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

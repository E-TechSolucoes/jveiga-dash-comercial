import path from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

import empreendimentosCatalog from "../../../empreendimentos.json";

import type { EmpreendimentoRef } from "./empreendimento-match";
import { foldEmpreendimentoNome, resolveEmpreendimentoFromRows } from "./empreendimento-match";

type EmpreendimentoCatalogRow = { idempreendimento: number; empreendimento: string };

/** Nomes e ids do painel (topbar); prioridade no match para não depender do ANY_VALUE do DW. */
const RECEP_CATALOG_REFS: EmpreendimentoRef[] = (
  empreendimentosCatalog as EmpreendimentoCatalogRow[]
)
  .filter(
    (r) =>
      typeof r.idempreendimento === "number" &&
      Number.isFinite(r.idempreendimento) &&
      r.idempreendimento > 0,
  )
  .map((r) => ({ id: r.idempreendimento, nome: String(r.empreendimento ?? "") }));

function mergeCatalogAndBqRefs(
  catalog: EmpreendimentoRef[],
  bq: EmpreendimentoRef[],
): EmpreendimentoRef[] {
  const catalogIds = new Set(catalog.map((c) => c.id));
  const onlyBq = bq.filter((r) => !catalogIds.has(r.id));
  return [...catalog, ...onlyBq];
}

const PROJECT = "jeronimo-444814";
const DATASET = "dwh";
const VISITAS = `\`${PROJECT}.${DATASET}.Visitas\``;
/** Mesmo esquema que Visitas; fonte adicional agregada na Recepção. */
const PUBLIC_VISITAS = `\`${PROJECT}.${DATASET}.public_visitas\``;
const PLANTAO = `\`${PROJECT}.${DATASET}.Plantao\``;

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

type VisitasEmpRow = { empreendimento_id: number; empreendimento: string };

let visitasEmpCache: { rows: VisitasEmpRow[]; at: number } | null = null;
const VISITAS_EMP_TTL_MS = 5 * 60 * 1000;

async function loadVisitasEmpreendimentos(): Promise<VisitasEmpRow[]> {
  const now = Date.now();
  if (visitasEmpCache && now - visitasEmpCache.at < VISITAS_EMP_TTL_MS) {
    return visitasEmpCache.rows;
  }
  const bq = getBigQuery();
  const [rows] = await bq.query({
    query: `
      SELECT empreendimento_id, ANY_VALUE(empreendimento) AS empreendimento
      FROM (
        SELECT empreendimento_id, empreendimento
        FROM ${VISITAS}
        WHERE empreendimento_id IS NOT NULL
        UNION ALL
        SELECT empreendimento_id, empreendimento
        FROM ${PUBLIC_VISITAS}
        WHERE empreendimento_id IS NOT NULL
      )
      GROUP BY empreendimento_id
    `,
  });
  visitasEmpCache = { rows: rows as VisitasEmpRow[], at: now };
  return rows;
}

export type RecepVisitaRow = {
  hora: string | null;
  cliente: string | null;
  origem: string | null;
  corretor: string | null;
};

export type RecepPlantaoRow = {
  corretor: string | null;
  imobiliaria: string | null;
  period: string | null;
  empreendimento: string | null;
};

export type RecepHistDia = {
  data: string;
  visitas: number;
  manha: number;
  tarde: number;
};

export type RecepEmpreendimentoMatched = {
  id: number | null;
  nome: string | null;
};

export type RecepPayload = {
  /** Primeiro empreendimento resolvido (compat com clientes legados que mostram um único id). */
  empreendimentoId: number | null;
  /** Nome canônico do primeiro empreendimento resolvido. */
  empreendimentoNomeMatch: string | null;
  /** Lista completa de empreendimentos resolvidos a partir dos `nomesSelecionados`. */
  empreendimentosMatched: RecepEmpreendimentoMatched[];
  /** Lista crua dos nomes selecionados no topbar. */
  nomesSelecionados: string[];
  /** Compat: primeiro nome selecionado. */
  nomeSelecionado: string;
  visitasHoje: RecepVisitaRow[];
  plantao: RecepPlantaoRow[];
  historico: RecepHistDia[];
  totals: { visitasHoje: number; visitasPeriodo: number; historicDays: number };
};

/** Data civil da visita (fuso São Paulo): BR, ISO, prefixo ISO em datetime, TIMESTAMP nativo, fallback created_at. */
function sqlVisitaDateSaoPaulo(dataCol: string, createdCol: string): string {
  const d = dataCol;
  const s = `NULLIF(TRIM(CAST(${d} AS STRING)), '')`;
  return `COALESCE(
    SAFE.PARSE_DATE('%d/%m/%Y', ${s}),
    SAFE.PARSE_DATE('%Y-%m-%d', ${s}),
    SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(TRIM(SUBSTR(${s}, 1, 10)), '')),
    DATE(SAFE_CAST(${d} AS TIMESTAMP), 'America/Sao_Paulo'),
    DATE(${createdCol}, 'America/Sao_Paulo')
  )`;
}

export async function fetchRecepPayload(nomesSelecionados: string[]): Promise<RecepPayload> {
  console.error("[recep] params", { nomesSelecionados });
  const bq = getBigQuery();
  const trimmedAll = nomesSelecionados.map((n) => n.trim()).filter((n) => n.length > 0);
  const visitasEmpRows = await loadVisitasEmpreendimentos();
  const bqRefs: EmpreendimentoRef[] = visitasEmpRows.map((r) => ({
    id: r.empreendimento_id,
    nome: r.empreendimento ?? "",
  }));
  const refs = mergeCatalogAndBqRefs(RECEP_CATALOG_REFS, bqRefs);

  const matchedMap = new Map<number, RecepEmpreendimentoMatched>();
  for (const trimmed of trimmedAll) {
    const resolved = resolveEmpreendimentoFromRows(trimmed, refs);
    if (resolved && !matchedMap.has(resolved.id)) {
      matchedMap.set(resolved.id, { id: resolved.id, nome: resolved.nome });
    }
  }
  const matched: RecepEmpreendimentoMatched[] = [...matchedMap.values()];
  const ids = matched
    .map((m) => m.id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  const empreendimentoId = matched[0]?.id ?? null;
  const empreendimentoNomeMatch = matched[0]?.nome ?? null;
  const nomeSelecionado = trimmedAll[0] ?? "";

  const empty: RecepPayload = {
    empreendimentoId,
    empreendimentoNomeMatch,
    empreendimentosMatched: matched,
    nomesSelecionados: trimmedAll,
    nomeSelecionado,
    visitasHoje: [],
    plantao: [],
    historico: [],
    totals: { visitasHoje: 0, visitasPeriodo: 0, historicDays: 14 },
  };

  const foldKeys = new Set(trimmedAll.map(foldEmpreendimentoNome).filter((s) => s.length > 0));

  const [plantaoRawUntyped] = await bq.query({
    query: `
      SELECT corretor, imobiliaria, period, empreendimento
      FROM ${PLANTAO}
      WHERE status = 'active'
        AND time_removed IS NULL
        AND time_entered >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
    `,
  });
  const plantaoRaw = plantaoRawUntyped as RecepPlantaoRow[];
  const plantao = plantaoRaw.filter(
    (p) => p.empreendimento && foldKeys.has(foldEmpreendimentoNome(p.empreendimento)),
  );

  if (ids.length === 0) {
    return { ...empty, plantao };
  }

  const idsParam = ids;

  const visitaDiaV = sqlVisitaDateSaoPaulo("v.data", "v.created_at_utc");
  const [visitasHojeRaw] = await bq.query({
    query: `
      SELECT hora, nome AS cliente, origem, corretor
      FROM (
        SELECT hora, nome, origem, corretor, empreendimento_id, data, created_at_utc
        FROM ${VISITAS}
        UNION ALL
        SELECT hora, nome, origem, corretor, empreendimento_id, data, created_at_utc
        FROM ${PUBLIC_VISITAS}
      ) v
      WHERE v.empreendimento_id IN UNNEST(@ids)
        AND ${visitaDiaV} = CURRENT_DATE('America/Sao_Paulo')
      ORDER BY CAST(v.hora AS STRING)
    `,
    params: { ids: idsParam },
    types: { ids: ["INT64"] },
  });
  const visitasHoje = visitasHojeRaw as RecepVisitaRow[];

  const [histRowsRaw] = await bq.query({
    query: `
      WITH base_visitas AS (
        SELECT data, turno, empreendimento_id, created_at_utc
        FROM ${VISITAS}
        WHERE empreendimento_id IN UNNEST(@ids)
          AND (
            data IS NOT NULL
            OR created_at_utc IS NOT NULL
          )
        UNION ALL
        SELECT data, turno, empreendimento_id, created_at_utc
        FROM ${PUBLIC_VISITAS}
        WHERE empreendimento_id IN UNNEST(@ids)
          AND (
            data IS NOT NULL
            OR created_at_utc IS NOT NULL
          )
      ),
      parsed AS (
        SELECT
          ${sqlVisitaDateSaoPaulo("data", "created_at_utc")} AS d,
          LOWER(TRIM(IFNULL(turno, ''))) AS turno_lc
        FROM base_visitas
      ),
      filtered AS (
        SELECT d, turno_lc
        FROM parsed
        WHERE d IS NOT NULL
          AND d BETWEEN DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL 13 DAY)
                    AND CURRENT_DATE('America/Sao_Paulo')
      )
      SELECT
        FORMAT_DATE('%d/%m/%Y', d) AS data_label,
        COUNT(*) AS visitas,
        COUNTIF(turno_lc = 'manha') AS manha,
        COUNTIF(turno_lc = 'tarde') AS tarde
      FROM filtered
      GROUP BY d
      ORDER BY d DESC
    `,
    params: { ids: idsParam },
    types: { ids: ["INT64"] },
  });
  const histRows = histRowsRaw as {
    data_label: string;
    visitas: number | string;
    manha: number | string;
    tarde: number | string;
  }[];

  const historico: RecepHistDia[] = histRows.map((r) => ({
    data: r.data_label,
    visitas: Number(r.visitas ?? 0),
    manha: Number(r.manha ?? 0),
    tarde: Number(r.tarde ?? 0),
  }));

  const visitasPeriodo = historico.reduce((s, h) => s + h.visitas, 0);

  const payload: RecepPayload = {
    empreendimentoId,
    empreendimentoNomeMatch,
    empreendimentosMatched: matched,
    nomesSelecionados: trimmedAll,
    nomeSelecionado,
    visitasHoje,
    plantao,
    historico,
    totals: {
      visitasHoje: visitasHoje.length,
      visitasPeriodo,
      historicDays: 14,
    },
  };
  console.error("[recep] result", {
    nomesSelecionados: trimmedAll,
    matched,
    visitasHojeCount: visitasHoje.length,
    plantaoCount: plantao.length,
    historicoDays: historico.length,
    visitasPeriodo,
  });
  return payload;
}

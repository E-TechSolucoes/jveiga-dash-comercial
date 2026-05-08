import path from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

import type { EmpreendimentoRef } from "./empreendimento-match";
import { foldEmpreendimentoNome, resolveEmpreendimentoFromRows } from "./empreendimento-match";

const PROJECT = "jeronimo-444814";
const DATASET = "dwh";
const VISITAS = `\`${PROJECT}.${DATASET}.Visitas\``;
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
      FROM ${VISITAS}
      WHERE empreendimento_id IS NOT NULL
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

function todayDataBr(): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const parts = fmt.formatToParts(new Date());
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  return `${d}/${m}/${y}`;
}

export async function fetchRecepPayload(nomesSelecionados: string[]): Promise<RecepPayload> {
  console.error("[recep] params", { nomesSelecionados });
  const bq = getBigQuery();
  const trimmedAll = nomesSelecionados.map((n) => n.trim()).filter((n) => n.length > 0);
  const visitasEmpRows = await loadVisitasEmpreendimentos();
  const refs: EmpreendimentoRef[] = visitasEmpRows.map((r) => ({
    id: r.empreendimento_id,
    nome: r.empreendimento ?? "",
  }));

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
  const todayStr = todayDataBr();

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

  const [visitasHojeRaw] = await bq.query({
    query: `
      SELECT hora, nome AS cliente, origem, corretor
      FROM ${VISITAS}
      WHERE empreendimento_id IN UNNEST(@ids)
        AND data = @hoje
      ORDER BY hora
    `,
    params: { ids: idsParam, hoje: todayStr },
    types: { ids: ["INT64"], hoje: "STRING" },
  });
  const visitasHoje = visitasHojeRaw as RecepVisitaRow[];

  const [histRowsRaw] = await bq.query({
    query: `
      WITH parsed AS (
        SELECT
          SAFE.PARSE_DATE('%d/%m/%Y', data) AS d,
          LOWER(TRIM(IFNULL(turno, ''))) AS turno_lc
        FROM ${VISITAS}
        WHERE empreendimento_id IN UNNEST(@ids)
          AND data IS NOT NULL
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

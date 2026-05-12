import path from "node:path";

import { BigQuery } from "@google-cloud/bigquery";

const PROJECT = "jeronimo-444814";
const DATASET = "dwh";
const LEADS = `\`${PROJECT}.${DATASET}.Leads\``;
const VISITAS = `\`${PROJECT}.${DATASET}.Visitas\``;
const PUBLIC_VISITAS = `\`${PROJECT}.${DATASET}.public_visitas\``;

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

export type ConversaoHistoricaInput = {
  empreendimentoCodigo: string | null;
  empreendimentoNome: string;
};

export type ConversaoHistoricaPayload = {
  meta: {
    empreendimento: string;
    codigo_interno_dwh_leads: string | null;
    leads_unicos_total: number;
    meses_com_lead: number;
    media_historica_mensal_leads: number;
    observacao_dados: string;
    filtros: {
      leads: string;
      visitas: string;
    };
    metricas: {
      taxa_conversao_mensal_pct: string;
      taxa_conversao_acumulada_pct: string;
    };
  };
  por_mes: Array<{
    mes: string;
    leads: number;
    visitas: number;
    taxa_conversao_mensal_pct: number | null;
    leads_acumulado: number;
    visitas_acumulado: number;
    taxa_conversao_acumulada_pct: number | null;
  }>;
};

export async function fetchConversaoHistorica(
  input: ConversaoHistoricaInput,
): Promise<ConversaoHistoricaPayload> {
  const bq = getBigQuery();
  const codigo = input.empreendimentoCodigo?.trim() || null;
  const nome = input.empreendimentoNome.trim();

  const [rowsRaw] = await bq.query({
    query: `
      CREATE TEMP FUNCTION fold(s STRING) AS (
        REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\\pM', '')
      );

      WITH params AS (
        SELECT @codigo AS codigo, fold(@nome) AS nome_fold
      ),
      -- Regra de lead único: cada idlead entra uma única vez, no mês do primeiro cadastro.
      lead_unico_base AS (
        SELECT
          l.idlead,
          MIN(DATE(SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad))) AS data_primeiro_cadastro
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
      leads_por_mes AS (
        SELECT
          DATE_TRUNC(data_primeiro_cadastro, MONTH) AS mes_ref,
          COUNT(*) AS leads
        FROM lead_unico_base
        GROUP BY mes_ref
      ),
      visitas_por_mes AS (
        SELECT
          DATE_TRUNC(
            COALESCE(
              SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(CAST(v.data AS STRING)), '')),
              SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(TRIM(CAST(v.data AS STRING)), '')),
              DATE(v.created_at_utc)
            ),
            MONTH
          ) AS mes_ref,
          COUNT(*) AS visitas
        FROM (
          SELECT data, created_at_utc, empreendimento FROM ${VISITAS}
          UNION ALL
          SELECT data, created_at_utc, empreendimento FROM ${PUBLIC_VISITAS}
        ) v
        CROSS JOIN params p
        WHERE fold(v.empreendimento) = p.nome_fold
          AND (
            SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(CAST(v.data AS STRING)), '')) IS NOT NULL
            OR SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(TRIM(CAST(v.data AS STRING)), '')) IS NOT NULL
            OR v.created_at_utc IS NOT NULL
          )
        GROUP BY mes_ref
      ),
      meses AS (
        SELECT mes_ref FROM leads_por_mes
        UNION DISTINCT
        SELECT mes_ref FROM visitas_por_mes
      )
      SELECT
        FORMAT_DATE('%Y-%m', m.mes_ref) AS mes,
        COALESCE(l.leads, 0) AS leads,
        COALESCE(v.visitas, 0) AS visitas,
        ROUND(SAFE_DIVIDE(COALESCE(v.visitas, 0), NULLIF(COALESCE(l.leads, 0), 0)) * 100, 2)
          AS taxa_conversao_mensal_pct,
        SUM(COALESCE(l.leads, 0)) OVER (ORDER BY m.mes_ref) AS leads_acumulado,
        SUM(COALESCE(v.visitas, 0)) OVER (ORDER BY m.mes_ref) AS visitas_acumulado,
        ROUND(
          SAFE_DIVIDE(
            SUM(COALESCE(v.visitas, 0)) OVER (ORDER BY m.mes_ref),
            NULLIF(SUM(COALESCE(l.leads, 0)) OVER (ORDER BY m.mes_ref), 0)
          ) * 100,
          2
        ) AS taxa_conversao_acumulada_pct
      FROM meses m
      LEFT JOIN leads_por_mes l USING (mes_ref)
      LEFT JOIN visitas_por_mes v USING (mes_ref)
      ORDER BY m.mes_ref
    `,
    params: { codigo, nome },
  });

  const rows = rowsRaw as Array<{
    mes: string;
    leads: number | string;
    visitas: number | string;
    taxa_conversao_mensal_pct: number | string | null;
    leads_acumulado: number | string;
    visitas_acumulado: number | string;
    taxa_conversao_acumulada_pct: number | string | null;
  }>;

  const last = rows.at(-1);
  const leadsTotal = Number(last?.leads_acumulado ?? 0);
  const visitasTotal = Number(last?.visitas_acumulado ?? 0);
  const mesesComLead = rows.reduce((acc, r) => (Number(r.leads ?? 0) > 0 ? acc + 1 : acc), 0);
  const mediaHistoricaMensalLeads = mesesComLead > 0 ? leadsTotal / mesesComLead : 0;

  return {
    meta: {
      empreendimento: nome,
      codigo_interno_dwh_leads: codigo,
      leads_unicos_total: leadsTotal,
      meses_com_lead: mesesComLead,
      media_historica_mensal_leads: mediaHistoricaMensalLeads,
      observacao_dados: `Lead único aplicado: ${leadsTotal.toLocaleString("pt-BR")} leads únicos (primeiro cadastro por idlead), ${visitasTotal.toLocaleString("pt-BR")} visitas e média histórica mensal de ${Math.round(mediaHistoricaMensalLeads).toLocaleString("pt-BR")} leads (${mesesComLead} meses com lead).`,
      filtros: {
        leads:
          codigo === null
            ? "Leads por nome normalizado do empreendimento; 1 lead por idlead no mês do primeiro cadastro."
            : `Leads por codigointerno_empreendimento = '${codigo}'; 1 lead por idlead no mês do primeiro cadastro.`,
        visitas:
          "Visitas em Visitas ∪ public_visitas; data em DD/MM/YYYY ou ISO (YYYY-MM-DD), com fallback created_at_utc.",
      },
      metricas: {
        taxa_conversao_mensal_pct: "visitas / leads * 100 no mês (NULL se leads=0).",
        taxa_conversao_acumulada_pct: "visitas acumuladas / leads acumulados * 100 até o mês.",
      },
    },
    por_mes: rows.map((r) => ({
      mes: r.mes,
      leads: Number(r.leads ?? 0),
      visitas: Number(r.visitas ?? 0),
      taxa_conversao_mensal_pct:
        r.taxa_conversao_mensal_pct === null ? null : Number(r.taxa_conversao_mensal_pct),
      leads_acumulado: Number(r.leads_acumulado ?? 0),
      visitas_acumulado: Number(r.visitas_acumulado ?? 0),
      taxa_conversao_acumulada_pct:
        r.taxa_conversao_acumulada_pct === null ? null : Number(r.taxa_conversao_acumulada_pct),
    })),
  };
}

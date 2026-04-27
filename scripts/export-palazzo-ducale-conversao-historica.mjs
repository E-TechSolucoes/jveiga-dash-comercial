import { BigQuery } from "@google-cloud/bigquery";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const bq = new BigQuery({
  keyFilename: path.join(root, "jeronimo-444814-29739d221cc6.json"),
  projectId: "jeronimo-444814",
});

const query = `
WITH
params AS (
  SELECT
    '21' AS codigo_interno_dw,
    'PALAZZO DUCALE' AS empreendimento_nome
),
lead_base AS (
  SELECT
    l.idlead,
    DATE_TRUNC(DATE(SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad)), MONTH) AS mes_ref
  FROM \`jeronimo-444814.dwh.Leads\` l
  CROSS JOIN params p
  WHERE l.codigointerno_empreendimento = p.codigo_interno_dw
    AND SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad) IS NOT NULL
  GROUP BY l.idlead, mes_ref
),
leads_por_mes AS (
  SELECT mes_ref, COUNT(*) AS leads
  FROM lead_base
  GROUP BY mes_ref
),
visitas_por_mes AS (
  SELECT
    DATE_TRUNC(
      COALESCE(
        SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(v.data), '')),
        DATE(v.created_at_utc)
      ),
      MONTH
    ) AS mes_ref,
    COUNT(*) AS visitas
  FROM \`jeronimo-444814.dwh.Visitas\` v
  CROSS JOIN params p
  WHERE UPPER(TRIM(v.empreendimento)) = p.empreendimento_nome
    AND (
      SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(v.data), '')) IS NOT NULL
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
`;

const [rows] = await bq.query({ query });

const out = {
  meta: {
    empreendimento: "PALAZZO DUCALE",
    codigo_interno_dwh_leads: "21",
    observacao_dados:
      "Snapshot atual: 952 leads distintos (Leads) e 4 linhas em Visitas para este nome. Se houver visitas em outro sistema ou com outro texto de empreendimento, elas não entram neste corte.",
    filtros: {
      leads:
        "dwh.Leads: codigointerno_empreendimento = '21'; contagem = COUNT(DISTINCT idlead) por mês de calendário de data_cad (parse %Y-%m-%d %H:%M:%S).",
      visitas:
        "dwh.Visitas: UPPER(TRIM(empreendimento)) = 'PALAZZO DUCALE' (o empreendimento_id 21 nesta tabela é outro empreendimento — ex.: Samba Grajau; filtro por nome). Mês da visita = DATE_TRUNC(PARSE data DD/MM/YYYY, MONTH), com fallback em created_at_utc.",
    },
    metricas: {
      taxa_conversao_mensal_pct: "visitas / leads * 100 no mês (NULL se leads=0).",
      taxa_conversao_acumulada_pct:
        "visitas acumuladas / leads acumulados * 100 até o mês (equivalente ao exemplo 120/1300).",
    },
  },
  por_mes: rows.map((r) => ({
    mes: r.mes,
    leads: Number(r.leads),
    visitas: Number(r.visitas),
    taxa_conversao_mensal_pct:
      r.taxa_conversao_mensal_pct === null ? null : Number(r.taxa_conversao_mensal_pct),
    leads_acumulado: Number(r.leads_acumulado),
    visitas_acumulado: Number(r.visitas_acumulado),
    taxa_conversao_acumulada_pct:
      r.taxa_conversao_acumulada_pct === null ? null : Number(r.taxa_conversao_acumulada_pct),
  })),
};

const dest = path.join(root, "palazzo-ducale-conversao-historica.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");
console.log("Wrote", dest, "months:", out.por_mes.length);

import { BigQuery } from "@google-cloud/bigquery";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "empreendimentos.json");
const outDir = path.join(root, "tx_consolidada");
const publicAliasDir = path.join(root, "public", "dados", "conversao-historica");

const empreendimentos = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const bq = new BigQuery({
  keyFilename: path.join(root, "jeronimo-444814-29739d221cc6.json"),
  projectId: "jeronimo-444814",
});

const escapeSql = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const paramRows = empreendimentos
  .map((row, idx) => {
    const codigo = row.codigo_interno_do_empreendimento;
    const codigoSql =
      codigo === null || codigo === undefined ? "CAST(NULL AS STRING)" : `'${escapeSql(codigo)}'`;
    return `SELECT ${idx} AS ordem, ${codigoSql} AS codigo_interno, '${escapeSql(row.empreendimento)}' AS empreendimento`;
  })
  .join("\nUNION ALL\n");

const query = `
WITH
params AS (
  ${paramRows}
),
params_norm AS (
  SELECT
    ordem,
    codigo_interno,
    empreendimento,
    REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(empreendimento)), NFD), r'\\pM', '') AS empreendimento_norm
  FROM params
),
lead_base AS (
  SELECT
    p.ordem,
    p.codigo_interno,
    p.empreendimento,
    l.idlead,
    DATE_TRUNC(DATE(SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad)), MONTH) AS mes_ref
  FROM \`jeronimo-444814.dwh.Leads\` l
  JOIN params_norm p
    ON (
      (p.codigo_interno IS NOT NULL AND l.codigointerno_empreendimento = p.codigo_interno)
      OR (
        p.codigo_interno IS NULL
        AND REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(l.empreendimento)), NFD), r'\\pM', '') = p.empreendimento_norm
      )
    )
  WHERE SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%S', l.data_cad) IS NOT NULL
  GROUP BY p.ordem, p.codigo_interno, p.empreendimento, l.idlead, mes_ref
),
leads_por_mes AS (
  SELECT ordem, codigo_interno, empreendimento, mes_ref, COUNT(*) AS leads
  FROM lead_base
  GROUP BY ordem, codigo_interno, empreendimento, mes_ref
),
visitas_por_mes AS (
  SELECT
    p.ordem,
    p.codigo_interno,
    p.empreendimento,
    DATE_TRUNC(
      COALESCE(
        SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(v.data), '')),
        DATE(v.created_at_utc)
      ),
      MONTH
    ) AS mes_ref,
    COUNT(*) AS visitas
  FROM \`jeronimo-444814.dwh.Visitas\` v
  JOIN params_norm p
    ON REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(v.empreendimento)), NFD), r'\\pM', '') = p.empreendimento_norm
  WHERE SAFE.PARSE_DATE('%d/%m/%Y', NULLIF(TRIM(v.data), '')) IS NOT NULL
     OR v.created_at_utc IS NOT NULL
  GROUP BY p.ordem, p.codigo_interno, p.empreendimento, mes_ref
),
meses AS (
  SELECT ordem, codigo_interno, empreendimento, mes_ref FROM leads_por_mes
  UNION DISTINCT
  SELECT ordem, codigo_interno, empreendimento, mes_ref FROM visitas_por_mes
),
base AS (
  SELECT
    m.ordem,
    m.codigo_interno,
    m.empreendimento,
    FORMAT_DATE('%Y-%m', m.mes_ref) AS mes,
    COALESCE(l.leads, 0) AS leads,
    COALESCE(v.visitas, 0) AS visitas,
    ROUND(SAFE_DIVIDE(COALESCE(v.visitas, 0), NULLIF(COALESCE(l.leads, 0), 0)) * 100, 2)
      AS taxa_conversao_mensal_pct,
    SUM(COALESCE(l.leads, 0)) OVER (
      PARTITION BY m.ordem
      ORDER BY m.mes_ref
    ) AS leads_acumulado,
    SUM(COALESCE(v.visitas, 0)) OVER (
      PARTITION BY m.ordem
      ORDER BY m.mes_ref
    ) AS visitas_acumulado
  FROM meses m
  LEFT JOIN leads_por_mes l
    ON l.ordem = m.ordem AND l.mes_ref = m.mes_ref
  LEFT JOIN visitas_por_mes v
    ON v.ordem = m.ordem AND v.mes_ref = m.mes_ref
)
SELECT
  ordem,
  codigo_interno,
  empreendimento,
  mes,
  leads,
  visitas,
  taxa_conversao_mensal_pct,
  leads_acumulado,
  visitas_acumulado,
  ROUND(SAFE_DIVIDE(visitas_acumulado, NULLIF(leads_acumulado, 0)) * 100, 2)
    AS taxa_conversao_acumulada_pct
FROM base
ORDER BY ordem, mes
`;

const [rows] = await bq.query({ query });

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(publicAliasDir, { recursive: true });

const byOrder = new Map();
for (const row of rows) {
  const key = Number(row.ordem);
  if (!byOrder.has(key)) byOrder.set(key, []);
  byOrder.get(key).push(row);
}

const written = [];
for (let i = 0; i < empreendimentos.length; i += 1) {
  const item = empreendimentos[i];
  const codigo = item.codigo_interno_do_empreendimento;
  const nome = item.empreendimento;
  const rowsForItem = byOrder.get(i) ?? [];
  const last = rowsForItem.at(-1);
  const leads = last ? Number(last.leads_acumulado) : 0;
  const visitas = last ? Number(last.visitas_acumulado) : 0;
  const codigoLabel = codigo ?? "sem-codigo";
  const publicAlias = codigo ?? `sem-codigo-${slugify(nome)}`;
  const fileName = `${codigoLabel}-${slugify(nome)}.json`;
  const outPath = path.join(outDir, fileName);

  const payload = {
    meta: {
      empreendimento: nome,
      codigo_interno_dwh_leads: codigo,
      arquivo: fileName,
      observacao_dados: `Snapshot atual: ${leads.toLocaleString("pt-BR")} leads distintos (Leads) e ${visitas.toLocaleString("pt-BR")} linhas em Visitas para este nome normalizado. Se houver visitas com outro texto de empreendimento, elas não entram neste corte.`,
      filtros: {
        leads:
          codigo === null
            ? "dwh.Leads: código interno ausente no cadastro; fallback por nome normalizado do empreendimento. Contagem = COUNT(DISTINCT idlead) por mês de data_cad."
            : `dwh.Leads: codigointerno_empreendimento = '${codigo}'. Contagem = COUNT(DISTINCT idlead) por mês de data_cad.`,
        visitas:
          "dwh.Visitas: empreendimento comparado por nome normalizado (sem acento, caixa alta e trim). Mês da visita = PARSE data DD/MM/YYYY, com fallback em created_at_utc.",
      },
      metricas: {
        taxa_conversao_mensal_pct: "visitas / leads * 100 no mês (NULL se leads=0).",
        taxa_conversao_acumulada_pct:
          "visitas acumuladas / leads acumulados * 100 até o mês (equivalente ao exemplo 120/1300).",
      },
    },
    por_mes: rowsForItem.map((r) => ({
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

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    path.join(publicAliasDir, `${publicAlias}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
  written.push({
    arquivo: fileName,
    empreendimento: nome,
    meses: payload.por_mes.length,
    leads,
    visitas,
  });
}

fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(written, null, 2), "utf8");
fs.writeFileSync(path.join(publicAliasDir, "index.json"), JSON.stringify(written, null, 2), "utf8");
console.table(written);
console.log(`Arquivos gravados em ${outDir}`);

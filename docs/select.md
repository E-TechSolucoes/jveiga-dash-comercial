## select de vendas (contagem)

```sql
CREATE TEMP FUNCTION fold(s STRING) AS (
  REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\pM', '')
);

WITH params AS (
  SELECT
    '52' AS codigo,
    fold('CONCEITO RESIDENCIAL') AS nome_fold,
    DATE('2026-04-01') AS d_from,
    DATE('2026-04-27') AS d_to
)
SELECT COUNT(*) AS vendas
FROM `jeronimo-444814.dwh.Reservas` r
CROSS JOIN params p
WHERE r.data_envio_sienge IS NOT NULL
  AND DATE(DATETIME(r.data_envio_sienge)) BETWEEN p.d_from AND p.d_to
  AND TRIM(CAST(r.codigo_interno_do_empreendimento AS STRING)) = TRIM(p.codigo);
```

## VGV no período, ticket médio (VGV por venda)

Mesma base de vendas: `data_envio_sienge` não nula, data de envio dentro do intervalo, filtro por código (ou por `fold(empreendimento)` quando não houver código).

Por reserva, o valor de linha usado no funil é:

`vgv_linha = IFNULL(valor_do_contrato, 0) - IFNULL(unica_pos_obra_valor, 0)`

(ordenar por `data_envio_sienge` só importa para listagens ou séries; **SUM** e **COUNT** no período não dependem da ordem.)

- **VGV no período** = `SUM(vgv_linha)` sobre todas as vendas do período.
- **Ticket médio** (= VGV médio por venda / “VGV por unidade” no KPI) = `SAFE_DIVIDE(SUM(vgv_linha), COUNT(*))` no mesmo conjunto.

```sql
CREATE TEMP FUNCTION fold(s STRING) AS (
  REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(s, ''))), NFD), r'\pM', '')
);

WITH params AS (
  SELECT
    '52' AS codigo,
    fold('CONCEITO RESIDENCIAL') AS nome_fold,
    DATE('2026-04-01') AS d_from,
    DATE('2026-04-27') AS d_to
),
vendas_periodo AS (
  SELECT
    DATETIME(r.data_envio_sienge) AS dt_envio,
    IFNULL(r.valor_do_contrato, 0) - IFNULL(r.unica_pos_obra_valor, 0) AS vgv_linha
  FROM `jeronimo-444814.dwh.Reservas` r
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
)
SELECT
  COUNT(*) AS vendas,
  SUM(vgv_linha) AS vgv_periodo,
  SAFE_DIVIDE(SUM(vgv_linha), NULLIF(COUNT(*), 0)) AS ticket_medio
FROM vendas_periodo;
```

Detalhe por venda (cronológico):

```sql
-- ... mesmo WITH params e vendas_periodo ...
SELECT dt_envio, vgv_linha
FROM vendas_periodo
ORDER BY dt_envio;
```

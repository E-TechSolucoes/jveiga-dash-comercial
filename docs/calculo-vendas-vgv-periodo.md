# Cálculo de vendas no período, VGV médio e VGV total

Este documento descreve como o dashboard calcula os KPIs:

- `Vendas no período`
- `VGV médio` (no código: `ticketMedio`, exibido como `performance.vgvMedio`)
- `VGV total no período` (no código: `vgvPeriodo`)

## Onde o cálculo acontece

- API: `src/app/api/dashboard/funil/route.ts`
- Query BigQuery: `src/lib/dashboard/bigquery-funil.ts`
- Consumo no frontend: `src/app/(dashboard)/dashboard/_components/dashboard-shell.tsx`
- Exibição na tela: `src/app/(dashboard)/dashboard/_components/funnel-section.tsx`

## Filtros aplicados

Os filtros sempre entram via query string da rota `GET /api/dashboard/funil`:

- `codigo`: código interno do empreendimento (quando existir)
- `nome`: nome do empreendimento (obrigatório)
- `from`: data inicial no formato `YYYY-MM-DD`
- `to`: data final no formato `YYYY-MM-DD`

No frontend, esses valores são montados em `dashboard-shell.tsx` usando o período selecionado e o empreendimento ativo.

### Regra de filtro por empreendimento

No SQL, o filtro segue esta prioridade:

1. Se `codigo` vier preenchido, filtra por código interno.
2. Se `codigo` vier vazio/nulo, filtra por nome normalizado (`fold`), ignorando caixa e acentos.

Isso evita divergência quando o empreendimento não tem código interno no cadastro.

### Regra de filtro por período

Para os indicadores de período, o intervalo sempre usa:

- `DATE(...) BETWEEN d_from AND d_to`

Sendo `d_from = DATE(@dateFrom)` e `d_to = DATE(@dateTo)`.

## Fontes de dados (BigQuery)

Tabelas usadas:

- `jeronimo-444814.dwh.Reservas` (base principal de vendas e VGV)
- `jeronimo-444814.dwh.Leads` e `jeronimo-444814.dwh.Visitas` (usadas em outros KPIs do funil)

Para os 3 KPIs deste documento, a base é a tabela `Reservas`.

## Definições e fórmulas

## 1) Vendas no período

Base: CTE `vendas_periodo`.

Critérios:

- `data_envio_sienge IS NOT NULL`
- data de envio dentro do período selecionado:
  - `DATE(DATETIME(data_envio_sienge)) BETWEEN d_from AND d_to`
- filtro de empreendimento (por `codigo` ou `nome` normalizado)

Fórmula:

- `vendas = COUNT(*)` sobre `vendas_periodo`

## 2) VGV médio

No SQL este indicador é retornado como `ticket_medio`.

Primeiro, para cada reserva elegível do período:

- `vgv_linha = IFNULL(valor_do_contrato, 0) - IFNULL(unica_pos_obra_valor, 0)`

Depois:

- `VGV médio = SUM(vgv_linha) / COUNT(*)`
- implementação: `SAFE_DIVIDE(SUM(vgv_linha), NULLIF(COUNT(*), 0))`

No frontend:

- `ticketMedio` da API alimenta `performance.vgvMedio`
- exibido no card como `Ticket médio` com subtítulo `VGV por unidade`

## 3) VGV total no período

No SQL este indicador é retornado como `vgv_periodo`.

Fórmula:

- `VGV total no período = SUM(vgv_linha)`
- onde `vgv_linha = valor_do_contrato - unica_pos_obra_valor` (com `IFNULL` para evitar nulos)

No frontend:

- `vgvPeriodo` da API alimenta `performance.vgvPeriodo`
- exibido no card como `VGV no período`

## Observações importantes

- O cálculo de `VGV médio` e `VGV total` usa exatamente a mesma base de registros (`vendas_periodo`).
- Se não houver vendas no período, `ticket_medio` retorna `0` no payload final (conversão com `Number(... ?? 0)`).
- Existe também `vendas_acumulado_historico` (sem filtro de data), mas este KPI é separado de `vendas no período`.

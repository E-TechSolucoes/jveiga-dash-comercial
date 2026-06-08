# Cálculo da Cascata da Meta (aba Resumo)

Este documento descreve, passo a passo, como o dashboard calcula os alvos
exibidos no card **"Cascata da Meta — Semana N"** da aba **Resumo**, para um
ou mais empreendimentos selecionados (ex.: _Conceito Poá_).

A meta é uma propagação inversa do funil: a partir de quantas vendas ainda
faltam para bater o plano do mês, o sistema calcula quantas pastas, visitas
e leads são necessárias considerando as **taxas históricas reais** do(s)
empreendimento(s) selecionado(s).

> **Resumo em uma linha:**
> `targetEtapa = realEtapa + ceil(necessárioEtapaSeguinte / taxaHistórica)`,
> partindo de `necessárioVendas = max(0, meta - vendasRealizadas)`.

---

## 1. Onde o cálculo acontece

| Camada                  | Arquivo                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Função pura (TS)        | [`src/app/(dashboard)/dashboard/_components/types.ts`](<../src/app/(dashboard)/dashboard/_components/types.ts>) — `computeCascadeRemaining` |
| UI / orquestração       | [`src/app/(dashboard)/dashboard/_components/cascade-card.tsx`](<../src/app/(dashboard)/dashboard/_components/cascade-card.tsx>)             |
| Provider (estado/dados) | [`src/app/(dashboard)/dashboard/_components/dashboard-provider.tsx`](<../src/app/(dashboard)/dashboard/_components/dashboard-provider.tsx>) |
| Hooks de fetch          | [`src/hooks/use-dashboard.ts`](../src/hooks/use-dashboard.ts) — `useSalesPlan`, `useTaxas`, `useFunil`, `usePastasKpis`                     |
| API: meta do mês        | `GET /api/v1/sales-plans/by-month?year=…&month=…` (backend externo)                                                                         |
| API: taxas históricas   | `GET /api/dashboard/taxas?codigos=…&nomes=…` → [`bigquery-taxas.ts`](../src/lib/dashboard/bigquery-taxas.ts)                                |
| API: funil do período   | `GET /api/dashboard/funil?codigos=…&nomes=…&from=…&to=…` → [`bigquery-funil.ts`](../src/lib/dashboard/bigquery-funil.ts)                    |
| API: pastas do período  | `GET /api/dashboard/pastas?codigos=…&nomes=…&from=…&to=…` → [`bigquery-pastas.ts`](../src/lib/dashboard/bigquery-pastas.ts)                 |

---

## 2. Insumos necessários

Para reproduzir o cálculo em outro sistema você precisa de **três grupos**
de dados, todos referentes ao(s) mesmo(s) empreendimento(s):

### 2.1 Meta de vendas do mês (`meta`)

Vem de `GET /api/v1/sales-plans/by-month?year=YYYY&month=M` e tem o formato:

```json
{
  "year": 2026,
  "month": 5,
  "total_planned_sales": 20,
  "items": [{ "empreendimento_id": 18, "empreendimento_name": "Conceito Poá", "planned_sales": 20 }]
}
```

A meta usada pela cascata é a **soma** de `planned_sales` dos itens cujo
`empreendimento_name` (normalizado em `NFD/uppercase/sem acento`) bate com
algum dos empreendimentos selecionados na topbar.

> O usuário pode sobrescrever a meta no input "Meta de vendas". O override
> é descartado sempre que a seleção de empreendimentos muda.

### 2.2 Números reais do período (`real`)

São **contagens absolutas** das ocorrências do funil, restringidas ao
período do filtro (Semana / Mês / Mês passado / Custom) **e** ao(s)
empreendimento(s) selecionado(s).

- `real.leads` = `leads` retornado por `/api/dashboard/funil`
- `real.visitas` = `visitas` retornado por `/api/dashboard/funil`
- `real.pastas` = `total` retornado por `/api/dashboard/pastas`
- `real.vendas` = `vendas` retornado por `/api/dashboard/funil`

> Observação: os agregados são contagens **idempotentes** por entidade
> (ex.: leads únicos por `idlead` no mês de primeiro cadastro). Veja
> `bigquery-funil.ts` e `bigquery-pastas.ts` para a SQL exata.

### 2.3 Taxas históricas de conversão (`taxas`)

São **a chave** de toda a cascata. Vêm de `GET /api/dashboard/taxas` e são
calculadas **sem filtro de data**, considerando todo o histórico do
empreendimento. Resposta:

```json
{
  "totals": { "leads": 12876, "visitas": 1300, "pastas": 619, "vendas": 198 },
  "taxas": { "lv": 0.10097, "vp": 0.47615, "pv": 0.31987 }
}
```

Definição (em SQL, `bigquery-taxas.ts`):

| Taxa | Numerador / Denominador        | Significado              |
| ---- | ------------------------------ | ------------------------ |
| `lv` | `visitas_total / leads_total`  | conversão lead → visita  |
| `vp` | `pastas_total / visitas_total` | conversão visita → pasta |
| `pv` | `vendas_total / pastas_total`  | conversão pasta → venda  |

Onde os totais vêm das tabelas BigQuery `dwh.Leads`, `dwh.Visitas`,
`dwh.Pastas` e `dwh.Reservas` (com `data_envio_sienge IS NOT NULL`),
filtradas por `idempreendimento ∈ ids` ou `fold(empreendimento) ∈ nomes_fold`.

**Fallback** (quando alguma etapa retorna zero histórico): `{ lv: 0.15, vp: 0.20, pv: 0.50 }`.

---

## 3. A fórmula `computeCascadeRemaining`

Implementação em TypeScript, idêntica ao que roda no front
([`types.ts`](<../src/app/(dashboard)/dashboard/_components/types.ts>)):

```ts
function ceilSafe(numerator: number, rate: number): number {
  return rate > 0 ? Math.ceil(numerator / rate) : 0;
}

function computeCascadeRemaining(ctx: {
  meta: number;
  taxas: { lv: number; vp: number; pv: number };
  vendasRealizadas: number;
  real: { leads: number; visitas: number; pastas: number };
}) {
  const remainingVendas = Math.max(0, ctx.meta - ctx.vendasRealizadas);
  const metaAtingida = remainingVendas === 0;

  const pastasNeeded = ceilSafe(remainingVendas, ctx.taxas.pv);
  const visitasNeeded = ceilSafe(pastasNeeded, ctx.taxas.vp);
  const leadsNeeded = ceilSafe(visitasNeeded, ctx.taxas.lv);

  return {
    pastas: ctx.real.pastas + pastasNeeded,
    visitas: ctx.real.visitas + visitasNeeded,
    leads: ctx.real.leads + leadsNeeded,
    remainingVendas,
    metaAtingida,
  };
}
```

E no card os alvos são montados assim
([`cascade-card.tsx`](<../src/app/(dashboard)/dashboard/_components/cascade-card.tsx>)):

```ts
const targets = computeCascadeRemaining({
  meta,
  taxas,
  vendasRealizadas: real.vendas,
  real: { leads: real.leads, visitas: real.visitas, pastas: real.pastas },
});

// Ordem dos cards na UI (esquerda → direita):
// Leads:    real.leads     / targets.leads
// Visitas:  real.visitas   / targets.visitas
// Pastas:   real.pastas    / targets.pastas
// Vendas:   real.vendas    / meta
```

### 3.1 Por que essa fórmula?

A cascata mostra **"quanto falta entrar no funil para fechar a meta"**, não
o teto teórico do mês inteiro. Por isso:

1. Subtrai o que já foi vendido: `remainingVendas = meta - vendasRealizadas`.
2. Aplica a inversa das taxas em **cascata reversa** com `ceil` em cada
   etapa (não dá para ter "meia visita"; quando há resto, exige uma a mais).
3. **Soma** o necessário ao já realizado no período. O alvo exibido é
   sempre `≥ real`, então a barra de progresso da etapa nunca pode passar
   de 100% por uma etapa "estar adiantada" — ela compensa o que falta
   adiante.

### 3.2 Comportamento em casos limite

- **Meta já batida** (`vendasRealizadas ≥ meta`): `remainingVendas = 0`,
  então `pastasNeeded = visitasNeeded = leadsNeeded = 0` e cada
  `targetEtapa = realEtapa`. A UI troca o insight para
  _"Meta de vendas atingida — pipeline coberto"_.
- **Taxa zerada** (`taxa <= 0`): `ceilSafe` retorna `0` para evitar
  `Infinity`. Na prática, isso só acontece se o histórico do empreendimento
  não tiver registros — nesse caso o front usa o fallback
  `{ 0.15, 0.20, 0.50 }`.
- **Múltiplos empreendimentos selecionados**: a meta é a **soma** dos
  `planned_sales` casados; as taxas históricas são calculadas com a união
  dos empreendimentos (`ids` e `nomes_fold` na query). O `real` também é
  somado naturalmente porque o BigQuery agrega tudo na mesma query.

---

## 4. Exemplo numérico (Conceito Poá — mês corrente)

Insumos do print do dashboard:

```text
leads:    258 / 1.299
visitas:   64 /   169
pastas:    29 /    79
vendas:     4 /    20   ← "20" é a meta do mês (planned_sales)
```

Logo, do `/api/dashboard/funil` + `/api/dashboard/pastas`:

```text
real    = { leads: 258, visitas: 64, pastas: 29, vendas: 4 }
meta    = 20
```

E do `/api/dashboard/taxas` (histórico do empreendimento):

```text
taxas ≈ { lv: 0.10086, vp: 0.47619, pv: 0.32000 }
```

Aplicando a fórmula:

```text
remainingVendas = max(0, 20 - 4)              = 16
pastasNeeded    = ceil(16  / 0.32000)         = 50
visitasNeeded   = ceil(50  / 0.47619)         = 105
leadsNeeded     = ceil(105 / 0.10086)         = 1041

targets.pastas  = real.pastas  + pastasNeeded  = 29  + 50   = 79   ✓
targets.visitas = real.visitas + visitasNeeded = 64  + 105  = 169  ✓
targets.leads   = real.leads   + leadsNeeded   = 258 + 1041 = 1299 ✓
targets.vendas  = meta                                       = 20   ✓
```

Os quatro alvos batem exatamente com o card.

---

## 5. Status visual de cada etapa

Cada estágio renderiza uma cor (`ok | warn | bad`) e uma barra de
progresso baseada em `pct(real, target)`
([`types.ts`](<../src/app/(dashboard)/dashboard/_components/types.ts>)):

```ts
function pct(real: number, target: number): number {
  return target > 0 ? Math.round((real / target) * 100) : 0;
}

function stageStatus(real: number, target: number): "ok" | "warn" | "bad" {
  const p = pct(real, target);
  if (p >= 80) return "ok";
  if (p >= 50) return "warn";
  return "bad";
}
```

E o **insight** geral do card é o pior estágio entre `Leads/Visitas/Pastas`
(o estágio _Vendas_ é excluído do diagnóstico de gargalo para não duplicar
a mensagem de "meta atingida"). As regras:

- `worstPct < 50` → `bad`, copy "Gargalo crítico em **{etapa}**…".
- `50 ≤ worstPct < 80` → `warn`, copy "Atenção em **{etapa}**…".
- `≥ 80` → `ok`, copy "Funil saudável…".

A "etapa" aqui é a com menor `pct(real, target)`. O `target` usado nessa
comparação é o **mesmo** alvo da cascata (já com a soma do necessário).

---

## 6. Pseudocódigo para replicar em outro sistema

```pseudo
INPUT:
  empreendimentos = [ids e/ou nomes selecionados]
  ano, mes        = mês corrente do dashboard
  periodo         = (from, to)  ; intervalo selecionado na topbar
  override        = meta editada manualmente (opcional)

# 1) Meta do mês (soma planned_sales dos empreendimentos selecionados)
plan = GET /sales-plans/by-month?year={ano}&month={mes}
meta = override
       ?? sum(item.planned_sales
              for item in plan.items
              if fold(item.empreendimento_name) in fold(empreendimentos))

# 2) Funil real do período
funil = GET /dashboard/funil?codigos=…&nomes=…&from=from&to=to
pastas = GET /dashboard/pastas?codigos=…&nomes=…&from=from&to=to
real = { leads: funil.leads,
         visitas: funil.visitas,
         pastas: pastas.total,
         vendas: funil.vendas }

# 3) Taxas históricas (sem filtro de data)
t = GET /dashboard/taxas?codigos=…&nomes=…
taxas = {
  lv: t.taxas.lv > 0 ? t.taxas.lv : 0.15,
  vp: t.taxas.vp > 0 ? t.taxas.vp : 0.20,
  pv: t.taxas.pv > 0 ? t.taxas.pv : 0.50
}

# 4) Cascata reversa
remainingVendas = max(0, meta - real.vendas)
pastasNeeded    = remainingVendas > 0 and taxas.pv > 0
                    ? ceil(remainingVendas / taxas.pv) : 0
visitasNeeded   = pastasNeeded   > 0 and taxas.vp > 0
                    ? ceil(pastasNeeded   / taxas.vp) : 0
leadsNeeded     = visitasNeeded  > 0 and taxas.lv > 0
                    ? ceil(visitasNeeded  / taxas.lv) : 0

OUTPUT:
  targets = {
    leads:   real.leads   + leadsNeeded,
    visitas: real.visitas + visitasNeeded,
    pastas:  real.pastas  + pastasNeeded,
    vendas:  meta
  }
  metaAtingida = (remainingVendas == 0)
```

---

## 7. Erros comuns ao replicar

1. **Usar taxas fixas (`0.15 / 0.20 / 0.50`) em vez das históricas**: o
   resultado bate apenas no fallback. Para Conceito Poá, por exemplo, a
   diferença entre `pv = 0.50` (fallback) e `pv ≈ 0.32` (real) muda
   `pastasNeeded` de 32 para 50.
2. **Esquecer o `ceil` em cada etapa**: usar arredondamento simples gera
   alvos que não fecham a aritmética porque o resíduo de uma etapa não
   propaga para a seguinte. Sempre arredondar **para cima**.
3. **Calcular o alvo só com a "necessidade", sem somar `real`**: a UI
   exibe `targetEtapa = realEtapa + necessárioEtapa`. Sem essa soma a
   barra de progresso fica inconsistente quando o time já adiantou
   leads/visitas no início do mês.
4. **Subtrair `vendasRealizadas` do `real.vendas` na barra**: o card
   `Vendas` usa `meta` como denominador (não `vendasHistoricoAcumulado`,
   que é só um KPI separado em `FunnelSection`).
5. **Aplicar filtro de data nas taxas históricas**: o endpoint `/taxas`
   é intencionalmente all-time. Usar o período atual subestima a base
   denominadora e infla `lv`/`vp`/`pv`.
6. **Misturar `empreendimento_id` do plano com `codigointerno_empreendimento`
   do BigQuery**: são identificadores distintos. O matching correto é por
   nome normalizado (`fold = NFD + uppercase + remover marcas + trim`).

---

## 8. Checklist mínimo de validação

Para confirmar que sua reimplementação está correta, reproduza o caso
documentado:

- [ ] `meta = 20`, `vendasRealizadas = 4` → `remainingVendas = 16`.
- [ ] Com `pv ≈ 0.320` → `pastasNeeded = 50`.
- [ ] Com `vp ≈ 0.476` → `visitasNeeded = 105`.
- [ ] Com `lv ≈ 0.101` → `leadsNeeded = 1041`.
- [ ] `targets = { leads: 1299, visitas: 169, pastas: 79, vendas: 20 }` somando ao `real` `{258, 64, 29, 4}`.
- [ ] Mudar `vendasRealizadas` para `20` zera `…Needed` e `targets` igualam `real` (e `metaAtingida = true`).

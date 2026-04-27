# Arsenal · Ações de Campo — Integração Front

Documento de integração da sub-aba **Ações de Campo** (aba **Armas** do
dashboard comercial). Cobre todos os endpoints, payloads, regras de negócio
e mapeamento campo-a-campo do que aparece na UI hoje
([arsenal-tab.tsx](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx>)).

> **Spec de banco:** [arsenal-field-actions-schema.md](./arsenal-field-actions-schema.md).

---

## 0. Convenções

| Tópico                         | Convenção                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Base URL                       | `/api/v1`                                                                                                 |
| Auth                           | `Authorization: Bearer <jwt>` em todas as rotas                                                           |
| `user_id`                      | sai do JWT — **nunca** vai no body/query                                                                  |
| Datas                          | `YYYY-MM-DD` na request; ISO-8601 (RFC3339) na response                                                   |
| Fuso de "hoje" / "esta semana" | `America/Sao_Paulo`                                                                                       |
| `week_start`                   | sempre **segunda-feira ISO** (1=Seg ... 7=Dom)                                                            |
| `weekday`                      | inteiro 1..6 (Seg..Sáb — **não tem domingo** na UI)                                                       |
| Erros                          | `{ "error": "...", "code": "...", "fields"?: {...} }`                                                     |
| Códigos de erro                | `BAD_REQUEST`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR` |

---

## 1. Recurso · Catálogo de armas (`/field-actions`)

Catálogo estático com as 6 armas de campo. **Read** é liberado pra qualquer
usuário autenticado. **Write** é admin-only (em geral o front nem usa write —
o seed já popula).

### `GET /api/v1/field-actions`

Lista as armas **ativas**, ordenadas por `display_order`.

**Response 200**

```json
[
  {
    "id": "9c4e...",
    "code": "panfleta",
    "nome": "Panfletagem",
    "descricao": "Panfletagem em pontos de fluxo (semáforos, lojas, mercados).",
    "resultado": "Indicações qualificadas no ponto de fluxo",
    "custo": "R$ 200 a R$ 400",
    "detalhe": "Distribuição em horários de pico, foco em pessoas que moram ou trabalham na região.",
    "icon_name": "Megaphone",
    "accent": "emerald",
    "display_order": 10,
    "is_active": true,
    "created_at": "2026-04-26T...",
    "updated_at": "2026-04-26T..."
  }
]
```

| Campo       | Como o front usa                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `code`      | slug estável — use pra mapear assets locais (ex: testes)                                                |
| `icon_name` | nome do ícone `lucide-react` (`Megaphone`, `Sword`, `Smartphone`, `Coffee`, `PhoneCall`, `PartyPopper`) |
| `accent`    | cor da skin (`emerald`, `teal`, `violet`, `amber`, `sky`, `rose`)                                       |
| `custo`     | string livre (pode ser `null`) — exibe no chip                                                          |

### `GET /api/v1/field-actions/{id}` · `POST` · `PUT` · `DELETE`

CRUD admin completo. Mesmo schema. **Conflict 409** se `code` duplicar;
**Conflict 409** no DELETE se houver `field_action_executions` referenciando.

---

## 2. Recurso · Cadastro de corretor (`/field-brokers`)

Cadastro **global** do corretor (sem semana). Escopo `user_id` do JWT — um
usuário **não enxerga** os corretores de outro. UNIQUE `(user_id, nome)`.

### `GET /api/v1/field-brokers`

Lista os corretores **ativos** do usuário, ordenados por `nome`.

**Response 200**

```json
[
  {
    "id": "b1...",
    "user_id": "u1...",
    "nome": "Bia Souza",
    "imobiliaria": "Imob ABC",
    "celular": "(11) 99999-9999",
    "is_active": true,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### `POST /api/v1/field-brokers`

**Request**

```json
{
  "nome": "Bia Souza",
  "imobiliaria": "Imob ABC", // opcional, default "—"
  "celular": "(11) 99999-9999" // opcional, ≤ 20 chars
}
```

**Response 201** = broker criado.
**409** `a broker with this name already exists for the user`.
**422** quando `nome` vazio ou strings excedem limites.

### `PATCH /api/v1/field-brokers/{id}`

PATCH parcial. **Apenas as chaves enviadas mudam**. Para limpar o celular,
mande `"celular": null`.

```json
{ "nome": "Bia S.", "imobiliaria": "—", "celular": null, "is_active": false }
```

### `DELETE /api/v1/field-brokers/{id}`

**409** se o broker tem participações em execuções (use `PATCH is_active=false`
para soft-delete preservando histórico).

---

## 3. Recurso · Foto da semana (`/arsenal/week`)

A ROTA QUE A TELA USA pra renderizar tudo de uma vez. Devolve, em uma única
resposta:

- corretores ativos do usuário **com** stats da semana **e** pts/nivel já calculados;
- catálogo de armas ativas **com** as 6 execuções (Seg-Sáb) hidratadas.

### `GET /api/v1/arsenal/week?week_start=2026-04-20`

`week_start` é opcional (default = **semana corrente** em BR). Se a data
enviada não cair numa segunda, o backend trunca pra segunda da semana ISO.

**Response 200** (resumo)

```json
{
  "week_start": "2026-04-20",
  "week_end": "2026-04-25",
  "week_number": 17,
  "validations": 4,
  "brokers": [
    {
      "broker_id": "b1...",
      "nome": "Bia Souza",
      "imobiliaria": "Imob ABC",
      "celular": "(11) 99999-9999",
      "is_active": true,
      "ind": 4,
      "vis": 2,
      "pas": 1,
      "pas_aprov": 1,
      "vendas": 0,
      "participacoes_na_semana": 3,
      "pts": 67,
      "nivel": "Capitão"
    }
  ],
  "actions": [
    {
      "action": {
        "id": "a1...",
        "code": "panfleta",
        "nome": "Panfletagem",
        "descricao": "...",
        "resultado": "...",
        "custo": "R$ 200 a R$ 400",
        "detalhe": "...",
        "icon_name": "Megaphone",
        "accent": "emerald",
        "display_order": 10
      },
      "executions": [
        {
          // index 0 = Segunda
          "id": "e1...",
          "action_id": "a1...",
          "week_start": "2026-04-20",
          "weekday": 1,
          "local": "Av. Paulista 900",
          "is_validated": true,
          "validated_at": "2026-04-20T13:42:00Z",
          "participants": [
            {
              "broker_id": "b1...",
              "nome": "Bia Souza",
              "imobiliaria": "Imob ABC",
              "celular": "(11) 99999-9999"
            }
          ]
        },
        null, // Terça (sem execução)
        null,
        null,
        null,
        null
      ]
    }
  ]
}
```

### Mapa do response → tela

| Tela                                    | Caminho no JSON                                               |
| --------------------------------------- | ------------------------------------------------------------- |
| Header "Semana N · DD/MM — DD/MM"       | `week_number` + `week_start` / `week_end`                     |
| "X validações"                          | `validations`                                                 |
| Tabela de corretores · linha            | `brokers[i]`                                                  |
| Coluna **Ind/Vis/Pas/PA/Ven**           | `brokers[i].{ind,vis,pas,pas_aprov,vendas}`                   |
| **Pts**                                 | `brokers[i].pts` (calculado, **não persistido**)              |
| **Nível**                               | `brokers[i].nivel` (`Soldado`, `Capitão`, `General`, `Lenda`) |
| Card de cada arma                       | `actions[i].action`                                           |
| Linha "Segunda", "Terça", ..., "Sábado" | `actions[i].executions[0..5]`                                 |
| Slot vazio                              | `executions[idx] === null` (execução ainda não criada)        |

> **Importante:** o array `executions` tem **sempre 6 posições** (0=Seg,
> 5=Sáb). Posições sem execução vêm como `null`. Não confie em `length`.

### Fórmula de scoring (espelha `arsenal-data.ts:302-313`)

```
pts =  ind * 3
     + vis * 5
     + pas * 10
     + pas_aprov * 20
     + vendas * 30
     + participacoes_na_semana * 5
     + (participacoes_na_semana >= 3 ? 10 : 0)

nivel = pts >= 150 ? "Lenda"
      : pts >= 100 ? "General"
      : pts >= 50  ? "Capitão"
      :              "Soldado"
```

---

## 4. Recurso · Execução (criar/editar/validar)

### `PUT /api/v1/arsenal/executions/{action_id}/{week_start}/{weekday}`

Cria ou atualiza a execução da arma `action_id` na semana `week_start` no
dia `weekday` (1=Seg ... 6=Sáb). Idempotente — chame quantas vezes precisar.

**Request**

```json
{
  "local": "Av. Paulista, 900",
  "participant_brokers": ["b1...", "b2..."]
}
```

| Campo                 | Comportamento                                               |
| --------------------- | ----------------------------------------------------------- |
| `local`               | string ≤ 200 ou `null`. Se ausente, mantém o atual.         |
| `participant_brokers` | **omitido** = não mexe; `[]` = zera; `[ids...]` = substitui |

**Response 200** = `field_action_executions` row pura (sem `participants`
hidratados — pra ver hidratado, recarregue o `/arsenal/week`).

> **Não** envie `is_validated` aqui — esse upsert NUNCA toca em
> `is_validated`/`validated_at`. Use os endpoints `/validate` ou
> `/unvalidate` abaixo.

### `POST /api/v1/arsenal/executions/{id}/validate`

Marca `is_validated = true`, `validated_at = NOW()`.

Pré-requisitos (validados no servidor):

1. `local` não-nulo, não-vazio
2. ≥ 1 participante em `participant_brokers`

**Response 200** = execução atualizada.
**422 VALIDATION_ERROR** com `fields` apontando o que falta:

```json
{
  "error": "validation failed",
  "code": "VALIDATION_ERROR",
  "fields": { "local": ["is required to validate"] }
}
```

### `POST /api/v1/arsenal/executions/{id}/unvalidate`

**Soft-undo recomendado.** Marca `is_validated = false`,
`validated_at = null`. Preserva `local` e participantes — o usuário pode
re-validar sem re-digitar.

### `DELETE /api/v1/arsenal/executions/{id}`

**Hard-undo.** Remove a execução. Participantes caem por CASCADE. Use
quando o usuário realmente quer apagar (ex: criou no dia errado).

---

## 5. Recurso · Estatísticas semanais do corretor

Linha `(broker_id, week_start)` com os 5 contadores que aparecem na tabela
de cadastro. **Não persistir `pts` / `nivel`** — eles vêm calculados em
`/arsenal/week`.

### `PUT /api/v1/arsenal/brokers/{broker_id}/stats`

**Request**

```json
{
  "week_start": "2026-04-20",
  "ind": 4,
  "vis": 2,
  "pas": 1,
  "pas_aprov": 1,
  "vendas": 0
}
```

`week_start` precisa cair numa segunda-feira (CHECK no banco). Inteiros
≥ 0. **Multi-tenant guard:** se `broker_id` não pertence ao `user_id` do
JWT, devolve **404 NOT_FOUND**.

**Response 200** = a linha persistida.

---

## 6. Fluxo típico da tela

### Carregar a aba (1 request):

```
GET /api/v1/arsenal/week?week_start=2026-04-20
```

Renderiza tudo. **Não** chame `/field-actions`, `/field-brokers` ou
`/field-broker-weekly-stats` em paralelo — todos os dados já estão no
response do `/week`.

### Cadastrar um corretor:

```
POST /api/v1/field-brokers       (1)
GET  /api/v1/arsenal/week?...    (2 — recarrega tudo)
```

### Editar local/participantes de uma execução:

```
PUT /api/v1/arsenal/executions/{action_id}/{week_start}/{weekday}
GET /api/v1/arsenal/week?...     (recarrega; o pts dos brokers muda)
```

### Validar:

```
POST /api/v1/arsenal/executions/{id}/validate
GET  /api/v1/arsenal/week?...    (validations++ + pts dos participantes)
```

### Atualizar contadores Ind/Vis/Pas/PA/Ven:

```
PUT /api/v1/arsenal/brokers/{broker_id}/stats
GET /api/v1/arsenal/week?...
```

> **Otimismo opcional.** Como o backend devolve a entidade atualizada em
> todas as escritas, dá pra atualizar o estado local sem refetch — mas
> qualquer mudança de `participantes` recalcula `pts` de **todos** os
> brokers participantes. Quando houver dúvida, refetch o `/week`.

---

## 7. Erros — guia rápido

| HTTP | `code`             | Quando                                                                                                                 |
| ---- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 400  | `BAD_REQUEST`      | JSON inválido, query param malformado, UUID inválido em path                                                           |
| 401  | `UNAUTHORIZED`     | sem Bearer token / token expirado                                                                                      |
| 403  | `FORBIDDEN`        | rota admin-only sem `is_admin`                                                                                         |
| 404  | `NOT_FOUND`        | recurso inexistente OU broker de outro user                                                                            |
| 409  | `CONFLICT`         | UNIQUE violado (nome de broker duplicado, code duplicado) ou DELETE de catálogo com execuções                          |
| 422  | `VALIDATION_ERROR` | regras de negócio (validate sem local/participantes, contadores < 0, week_start ≠ segunda) — sempre acompanha `fields` |
| 500  | `INTERNAL_ERROR`   | bug do back; ver logs                                                                                                  |

Body padrão de validação:

```json
{
  "error": "validation failed",
  "code": "VALIDATION_ERROR",
  "fields": { "celular": ["must be 20 characters or fewer"] }
}
```

---

## 8. Constantes que o front pode hardcodar

```ts
export const FIELD_ACTION_CODES = [
  "panfleta",
  "portaria",
  "blitz",
  "evento",
  "reativa",
  "celebra",
] as const;

export const FIELD_NIVEIS = ["Soldado", "Capitão", "General", "Lenda"] as const;

// Pesos = idênticos a arsenal-data.ts:302-313 (mantenha sincronizado).
export const FIELD_PESOS = {
  PTS_POR_ACAO_VALIDADA: 5,
  BONUS_3_ACOES: 10,
  PTS_POR_INDICACAO: 3,
  PTS_POR_VISITA: 5,
  PTS_POR_PASTA: 10,
  PTS_POR_PASTA_APROV: 20,
  PTS_POR_VENDA: 30,
  LIMIAR_CAPITAO: 50,
  LIMIAR_GENERAL: 100,
  LIMIAR_LENDA: 150,
} as const;

export const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
```

> O backend já calcula `pts` e `nivel` antes de devolver — re-cálculo no
> front é só pra preview otimista. Se divergir, **trust the server**.

---

## 9. Mapa rápido de arquivos backend

| Camada             | Arquivo                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema SQL         | [db/sql/arsenal_field_actions.sql](../db/sql/arsenal_field_actions.sql)                                                                                                                                                                                                                                            |
| Migration Bun      | [db/migrations/20260426000000_arsenal_field_actions.go](../db/migrations/20260426000000_arsenal_field_actions.go)                                                                                                                                                                                                  |
| Models             | [model/field_action.go](../model/field_action.go), [field_broker.go](../model/field_broker.go), [field_broker_weekly_stats.go](../model/field_broker_weekly_stats.go), [field_action_execution.go](../model/field_action_execution.go), [field_action_participant.go](../model/field_action_participant.go)        |
| DTOs               | [dto/field_action.go](../dto/field_action.go), [field_broker.go](../dto/field_broker.go), [field_action_execution.go](../dto/field_action_execution.go), [arsenal_week.go](../dto/arsenal_week.go)                                                                                                                 |
| Repos (interfaces) | [repository/repository.go](../repository/repository.go)                                                                                                                                                                                                                                                            |
| Repos (Postgres)   | [repository/postgres/field_actions.go](../repository/postgres/field_actions.go), [field_brokers.go](../repository/postgres/field_brokers.go), [field_broker_weekly_stats.go](../repository/postgres/field_broker_weekly_stats.go), [field_action_executions.go](../repository/postgres/field_action_executions.go) |
| Services           | [services/field_action.go](../services/field_action.go), [field_broker.go](../services/field_broker.go), [arsenal.go](../services/arsenal.go)                                                                                                                                                                      |
| Handlers           | [handler/field_action.go](../handler/field_action.go), [field_broker.go](../handler/field_broker.go), [arsenal.go](../handler/arsenal.go)                                                                                                                                                                          |
| Rotas              | [application/routes.go](../application/routes.go) (procure `field-actions`, `field-brokers`, `arsenal`)                                                                                                                                                                                                            |
| Wiring             | [application/app.go](../application/app.go)                                                                                                                                                                                                                                                                        |

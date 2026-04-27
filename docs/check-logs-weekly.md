# Check Logs Weekly API

Controle **semanal** de preenchimento dos checklists (stand e daily) por usuário.
Para cada item ativo do catálogo, o usuário pode marcar/desmarcar uma vez por
**semana ISO** (segunda → domingo). O servidor mantém apenas uma linha por
`(user_id, item_id, week_start)` — re-enviar a mesma marcação é idempotente.

- **Base paths:**
  - Stand: `/api/v1/stand-check-logs`
  - Daily: `/api/v1/daily-check-logs`
- **Content-Type:** `application/json`
- **Auth:** _(nenhuma — herda o middleware global do servidor)_

> Os dois recursos (stand/daily) compartilham o **mesmo contrato**. Os exemplos
> abaixo usam `stand-check-logs`; troque o prefixo para `daily-check-logs`
> sempre que estiver lidando com o checklist diário.

---

## Conceitos

### Semana ISO (week_start)

`week_start` é sempre a **segunda-feira** (00:00 UTC) da semana ISO.
O cliente pode mandar qualquer data dentro da semana — o servidor normaliza
para a segunda. Exemplo: `"2026-04-23"` (quinta) → persiste como
`"2026-04-20"` (segunda).

### user_id

String opaca (≤ 64 caracteres) que identifica o usuário. Pode ser UUID,
email, login, sub do JWT — o backend não valida formato. **A mesma chave
deve ser usada em todos os endpoints**, senão a leitura não encontra o que
foi gravado.

### Estado por (user, item, semana)

| Campo        | Tipo       | Notas                                                               |
| ------------ | ---------- | ------------------------------------------------------------------- |
| `id`         | UUID       | ID interno do log (não-essencial pro front)                         |
| `user_id`    | string     | Identificador do usuário                                            |
| `item_id`    | UUID       | FK pro item de catálogo (`stand_check_items` / `daily_check_items`) |
| `week_start` | date       | Segunda-feira da semana ISO (`YYYY-MM-DD`, sempre normalizado)      |
| `is_checked` | boolean    | Se o item está marcado nessa semana                                 |
| `checked_at` | timestamp? | Momento em que foi marcado. `null` quando `is_checked = false`      |
| `note`       | string?    | Comentário opcional (≤ 500 caracteres)                              |
| `created_at` | timestamp  | Quando o registro foi criado                                        |
| `updated_at` | timestamp  | Última alteração                                                    |

---

## Endpoints

### 1. Visão da semana (estado atual)

```
GET /api/v1/stand-check-logs/week
GET /api/v1/daily-check-logs/week
```

Retorna o **catálogo de itens ativos** já mesclado com o estado de check do
usuário para a semana solicitada. É o endpoint que o front usa pra renderizar
a tela de checklist semanal.

#### Query params

| Param        | Tipo          | Obrigatório | Descrição                                                               |
| ------------ | ------------- | ----------- | ----------------------------------------------------------------------- |
| `user_id`    | string        | sim         | Identificador do usuário                                                |
| `week_start` | string (date) | não         | Qualquer data dentro da semana alvo (`YYYY-MM-DD`). Default: hoje (UTC) |

#### Exemplo

```bash
curl "http://localhost:8080/api/v1/stand-check-logs/week?user_id=edson@empresa.com&week_start=2026-04-23"
```

#### Resposta — `200 OK`

```json
{
  "user_id": "edson@empresa.com",
  "week_start": "2026-04-20T00:00:00Z",
  "total_items": 22,
  "checked_count": 2,
  "items": [
    {
      "item": {
        "id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
        "code": "banner",
        "label": "Banner do empreendimento + logos",
        "icon_name": "Flag",
        "display_order": 10,
        "is_active": true,
        "created_at": "2026-04-25T13:05:11.123456Z",
        "updated_at": "2026-04-25T13:05:11.123456Z"
      },
      "is_checked": true,
      "checked_at": "2026-04-21T09:13:20Z",
      "note": null,
      "log_id": "5b9f0f1a-1aaa-4bbb-8ccc-1d2e3f4a5b6c"
    },
    {
      "item": {
        "id": "9d9c1e9a-3b1f-4d8a-9b1f-6f0d1d2a3b4c",
        "code": "maquete",
        "label": "Maquete / planta humanizada",
        "icon_name": "LayoutGrid",
        "display_order": 20,
        "is_active": true,
        "created_at": "2026-04-25T13:05:11.123456Z",
        "updated_at": "2026-04-25T13:05:11.123456Z"
      },
      "is_checked": false,
      "checked_at": null,
      "note": null,
      "log_id": null
    }
  ]
}
```

> **Notas para o front:**
>
> - `items[*].log_id` é `null` enquanto o usuário **nunca** tocou no item. Use `item.id` (não `log_id`) ao chamar o `PUT /` — o backend faz upsert.
> - `total_items` reflete o catálogo **ativo no momento da consulta** (itens desativados depois de checados não entram aqui).
> - `checked_count` conta apenas itens ainda ativos que estão marcados.
> - A ordem dos `items` segue `display_order ASC`.

#### Erros

| Status | `code`           | Quando                                                |
| ------ | ---------------- | ----------------------------------------------------- |
| `400`  | `BAD_REQUEST`    | `user_id` ausente ou `week_start` em formato inválido |
| `500`  | `INTERNAL_ERROR` | Falha no banco                                        |

---

### 2. Marcar / desmarcar item (upsert)

```
PUT /api/v1/stand-check-logs
PUT /api/v1/daily-check-logs
```

Idempotente: cria o registro se não existir, atualiza se existir. Use o
mesmo endpoint pra marcar (`is_checked: true`) e desmarcar (`is_checked: false`).

#### Body

| Campo        | Tipo          | Obrigatório | Regras                                                        |
| ------------ | ------------- | ----------- | ------------------------------------------------------------- |
| `user_id`    | string        | sim         | ≤ 64 caracteres                                               |
| `item_id`    | string (UUID) | sim         | Deve referenciar um item existente no catálogo                |
| `week_start` | string (date) | não         | Qualquer data na semana alvo. Default: hoje (UTC)             |
| `is_checked` | boolean       | sim         | `true` marca, `false` desmarca                                |
| `note`       | string        | não         | ≤ 500 caracteres. Pode ser `""` para limpar uma nota anterior |

#### Exemplo — marcar

```bash
curl -X PUT "http://localhost:8080/api/v1/stand-check-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "edson@empresa.com",
    "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
    "week_start": "2026-04-23",
    "is_checked": true
  }'
```

#### Exemplo — desmarcar

```bash
curl -X PUT "http://localhost:8080/api/v1/stand-check-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "edson@empresa.com",
    "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
    "is_checked": false
  }'
```

#### Resposta — `200 OK`

```json
{
  "id": "5b9f0f1a-1aaa-4bbb-8ccc-1d2e3f4a5b6c",
  "user_id": "edson@empresa.com",
  "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
  "week_start": "2026-04-20T00:00:00Z",
  "is_checked": true,
  "checked_at": "2026-04-23T14:00:00Z",
  "note": null,
  "created_at": "2026-04-23T14:00:00Z",
  "updated_at": "2026-04-23T14:00:00Z"
}
```

> O backend gerencia `checked_at`: vira `now()` quando `is_checked` passa
> a `true` e vira `null` quando passa a `false`.

#### Erros

| Status | `code`             | Quando                                                                  |
| ------ | ------------------ | ----------------------------------------------------------------------- |
| `400`  | `BAD_REQUEST`      | JSON inválido, `week_start` mal formatado, ou data não cai numa segunda |
| `404`  | `NOT_FOUND`        | `item_id` não existe no catálogo                                        |
| `422`  | `VALIDATION_ERROR` | `user_id`/`item_id` ausentes, `note` > 500 chars                        |
| `500`  | `INTERNAL_ERROR`   | Falha no banco                                                          |

#### Exemplo de erro 422

```json
{
  "error": "validation failed",
  "code": "VALIDATION_ERROR",
  "fields": {
    "user_id": ["is required"]
  }
}
```

---

### 3. Histórico de semanas (resumo)

```
GET /api/v1/stand-check-logs/history
GET /api/v1/daily-check-logs/history
```

Retorna **um resumo por semana** em que o usuário fez ao menos uma marcação.
Útil pra montar gráficos de aderência ao longo do tempo.

#### Query params (escolha um modo)

| Param     | Tipo          | Default      | Descrição                                       |
| --------- | ------------- | ------------ | ----------------------------------------------- |
| `user_id` | string        | _(obrigat.)_ | Identificador do usuário                        |
| `weeks`   | int (1..52)   | `12`         | **Modo rolante**: últimas N semanas até hoje    |
| `from`    | string (date) | —            | **Modo intervalo**: data inicial (`YYYY-MM-DD`) |
| `to`      | string (date) | —            | **Modo intervalo**: data final (`YYYY-MM-DD`)   |

Use `weeks` **ou** `from`+`to`. Se nenhum for fornecido, retorna as últimas
12 semanas. `from` e `to` são exigidos juntos.

#### Exemplo — últimas 8 semanas

```bash
curl "http://localhost:8080/api/v1/stand-check-logs/history?user_id=edson@empresa.com&weeks=8"
```

#### Exemplo — intervalo explícito

```bash
curl "http://localhost:8080/api/v1/stand-check-logs/history?user_id=edson@empresa.com&from=2026-01-01&to=2026-04-25"
```

#### Resposta — `200 OK`

```json
[
  {
    "week_start": "2026-04-20T00:00:00Z",
    "total_items": 22,
    "checked_count": 17
  },
  {
    "week_start": "2026-04-13T00:00:00Z",
    "total_items": 22,
    "checked_count": 22
  },
  {
    "week_start": "2026-04-06T00:00:00Z",
    "total_items": 22,
    "checked_count": 9
  }
]
```

> Semanas em que o usuário **não tocou em nada** não aparecem na lista —
> trate-as como `checked_count: 0` no front, se precisar exibir.
> `total_items` é o total **ativo agora** (não na época da semana), então o
> histórico evolui se a TI ativar/desativar itens.

#### Erros

| Status | `code`           | Quando                                                                                                         |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `400`  | `BAD_REQUEST`    | `user_id` ausente, `weeks` fora de [1..52], `from`/`to` mal formados, ou `from`+`to` não foram enviados juntos |
| `500`  | `INTERNAL_ERROR` | Falha no banco                                                                                                 |

---

## Fluxo no front

Tela de checklist semanal:

1. Usuário abre a tela.
2. Front chama `GET /week?user_id=<u>` (sem `week_start` → semana atual).
3. Renderiza a lista de `items` com toggle baseado em `is_checked`.
4. Toggle dispara `PUT /` com `is_checked` invertido. **Otimista**: o front
   atualiza o estado local imediatamente; em caso de erro, reverte.
5. Pra navegar pra semanas passadas, refaz `GET /week?week_start=...`.

Tela de histórico/relatório:

1. Front chama `GET /history?user_id=<u>&weeks=12`.
2. Mapeia para um gráfico de barras `checked_count / total_items`.

### TypeScript types (sugestão)

```ts
type StandCheckItem = {
  id: string;
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CheckLogWeekItem = {
  item: StandCheckItem; // troque o tipo pra DailyCheckItem no daily
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
  log_id: string | null;
};

type CheckLogWeekView = {
  user_id: string;
  week_start: string; // ISO 8601, sempre uma segunda 00:00 UTC
  total_items: number;
  checked_count: number;
  items: CheckLogWeekItem[];
};

type CheckLogUpsertBody = {
  user_id: string;
  item_id: string;
  week_start?: string; // YYYY-MM-DD
  is_checked: boolean;
  note?: string;
};

type WeekSummary = {
  week_start: string;
  total_items: number;
  checked_count: number;
};
```

---

## Tabelas no banco

```sql
CREATE TABLE stand_check_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(64)  NOT NULL,
  item_id     UUID         NOT NULL REFERENCES stand_check_items(id) ON DELETE CASCADE,
  week_start  DATE         NOT NULL,
  is_checked  BOOLEAN      NOT NULL DEFAULT FALSE,
  checked_at  TIMESTAMPTZ,
  note        VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id, week_start),
  CHECK (EXTRACT(ISODOW FROM week_start) = 1)
);

-- daily_check_logs idêntica, FK pra daily_check_items.
```

Scripts prontos:

- [db/sql/stand_check_logs.sql](../db/sql/stand_check_logs.sql)
- [db/sql/daily_check_logs.sql](../db/sql/daily_check_logs.sql)

---

## Formato padrão de erro

```json
{
  "error": "<mensagem>",
  "code": "<ENUM>",
  "fields": { "<campo>": ["<motivo>"] }
}
```

`fields` só aparece em `422 VALIDATION_ERROR`.

| `code`             | HTTP  | Significado                              |
| ------------------ | ----- | ---------------------------------------- |
| `BAD_REQUEST`      | `400` | Body inválido ou parâmetro mal formatado |
| `NOT_FOUND`        | `404` | `item_id` não existe                     |
| `VALIDATION_ERROR` | `422` | Falha de validação de campo              |
| `INTERNAL_ERROR`   | `500` | Erro inesperado no servidor              |

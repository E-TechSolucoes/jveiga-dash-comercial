# Checklists — Integração Front-end (unificada)

Doc unificada para implementar **as duas telas** de checklist do produto:

| Tela                | Catálogo (admin)    | Atividade (usuário)                            |
| ------------------- | ------------------- | ---------------------------------------------- |
| **Stand Checklist** | `stand_check_items` | `stand_check_activity` (1 linha por dia)       |
| **Daily Checklist** | `check_items_daily` | `check_items_daily_activity` (1 linha por dia) |

> Ambos os módulos seguem **a mesma arquitetura**. As únicas diferenças
> entre eles são (1) o catálogo de items que é exibido e (2) os paths das
> rotas. Tudo o resto — body, validação, regras de `checked_at`, history,
> formato de erro — é idêntico.

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Auth:** Bearer token (header `Authorization: Bearer <jwt>`).

---

## Endpoints (resumo)

| #   | Método | Path                                                    | Para quê                                                                              |
| --- | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | `GET`  | `/api/v1/stand-check-items`                             | Catálogo stand (ativos) + estado de hoje. Sem params. **Tela do dia, leitura única.** |
| 2   | `PUT`  | `/api/v1/stand-check-activity`                          | Salvar (criar OU atualizar) os checks de um dia do **stand**.                         |
| 3   | `GET`  | `/api/v1/stand-check-activity/day?day=YYYY-MM-DD`       | Ler o stand de **um dia específico** (com totais).                                    |
| 4   | `GET`  | `/api/v1/stand-check-activity/history?days=30`          | Resumo (day, total, checked) por dia em que existe linha persistida.                  |
| 5   | `GET`  | `/api/v1/check-items-daily`                             | Catálogo daily (ativos) + estado de hoje. Sem params. **Tela do dia, leitura única.** |
| 6   | `PUT`  | `/api/v1/check-items-daily-activity`                    | Salvar (criar OU atualizar) os checks de um dia do **daily**.                         |
| 7   | `GET`  | `/api/v1/check-items-daily-activity/day?day=YYYY-MM-DD` | Ler o daily de **um dia específico** (com totais).                                    |
| 8   | `GET`  | `/api/v1/check-items-daily-activity/history?days=30`    | Resumo (day, total, checked) por dia em que existe linha persistida.                  |

> **A tela do dia precisa de UM request só** — `GET /...check-items` (item 1
> ou 5) já volta o catálogo enriquecido com o estado de hoje. Use `/day` e
> `/history` para visualizar dias arbitrários ou montar gráficos.

---

## Modelo mental

```
┌──────────────────────────┐         ┌──────────────────────────────────────┐
│ <prefix>_check_items     │         │ <prefix>_check_activity              │
│  (catálogo / admin)      │         │  (1 linha por user_id + day)         │
│                          │         │                                      │
│  id, code, label,        │ ◄──┐    │  id, user_id, day, items (JSONB)     │
│  icon_name,              │    │    │                                      │
│  display_order,          │    │    │  items[*]:                           │
│  is_active               │    └────│    item_id (UUID),                   │
└──────────────────────────┘         │    is_checked, checked_at, note      │
                                     └──────────────────────────────────────┘
```

- O **catálogo** tem uma linha por item (banner, maquete, ranking_tv, etc.) — `id` UUID estável.
- A **atividade** é **uma linha por `(user_id, day)`** com um array JSONB `items` que guarda quais items foram marcados naquele dia, quando, e com qual nota.
- `user_id` vem **sempre do JWT** (Bearer token) — em GET, PUT ou history. O front **não envia** esse campo. Se enviar, é ignorado. Isso evita que um usuário grave em nome de outro e garante consistência entre PUT (escrita) e GET (leitura).
- A granularidade é **diária**. Cada dia tem sua foto independente.
- O conceito de "dia" é em **America/Sao_Paulo (BR)**, não UTC. Calcular hoje em UTC quebrava à noite (depois de 21:00 BR já viraria o dia seguinte em UTC, então write e read divergiam).

---

## 1. Carregar a tela do dia

> Mesma forma para os dois módulos — só muda o path.

```
GET /api/v1/stand-check-items         ← stand
GET /api/v1/check-items-daily         ← daily
```

Devolve **só os itens ATIVOS** do catálogo, cada um já com o estado de
check do **dia de hoje (BR)** para o usuário do JWT. É o único request
que o front precisa fazer ao abrir a tela.

### Query params

**Nenhum.** Os endpoints não aceitam parâmetros — `is_active=true` e
`day=hoje (BR)` são fixos. O front filtra/destaca localmente os itens
com `is_checked: true` se quiser separar marcados de não-marcados na UI.

### Exemplo

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/stand-check-items"
```

### Resposta — `200 OK`

Array de items do catálogo, cada um com o estado embutido (formato **flat**):

```json
[
  {
    "id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
    "code": "banner",
    "label": "Banner do empreendimento + logos",
    "icon_name": "Flag",
    "display_order": 10,
    "is_active": true,
    "created_at": "2026-04-25T13:05:11.123456Z",
    "updated_at": "2026-04-25T13:05:11.123456Z",

    "is_checked": true,
    "checked_at": "2026-04-25T09:13:20Z",
    "note": null
  },
  {
    "id": "9d9c1e9a-3b1f-4d8a-9b1f-6f0d1d2a3b4c",
    "code": "maquete",
    "label": "Maquete / planta humanizada",
    "icon_name": "LayoutGrid",
    "display_order": 20,
    "is_active": true,
    "created_at": "2026-04-25T13:06:00.000000Z",
    "updated_at": "2026-04-25T13:06:00.000000Z",

    "is_checked": false,
    "checked_at": null,
    "note": null
  }
]
```

### Notas para o front

- Cada item já vem com `is_checked` / `checked_at` / `note` — **não precisa fazer um request separado** pra resolver o estado.
- O endpoint sempre retorna **hoje (BR)**. Para outros dias, use `/...activity/day?day=YYYY-MM-DD`.
- O backend já filtra apenas `is_active=true` — itens desativados não aparecem.
- A ordem segue `display_order ASC, created_at ASC` — renderize na ordem que vier.
- `checked_at` é **server-managed** — o front nunca precisa montar isso.
- Para destacar/separar marcados na UI, faça o parse local: `items.filter(it => it.is_checked)`.

---

## 2. Salvar os checks (criar ou atualizar)

> Mesma forma para os dois módulos — só muda o path.

```
PUT /api/v1/stand-check-activity              ← stand
PUT /api/v1/check-items-daily-activity        ← daily
```

**Único endpoint** para salvar — faz upsert idempotente:

- Se ainda não existe linha pra `(user_id, day)`, **cria**.
- Se já existe, **substitui** o array `items` pelo que veio no body.

> ⚠️ **É replace-all.** Itens omitidos do `items` somem do array (somem
> = ficam desmarcados). Sempre envie a foto **completa** do dia.

### Body — `ReplaceActivityRequest`

```ts
{
  day?: string;             // YYYY-MM-DD. Default: hoje (BR — America/Sao_Paulo)
  items: Array<{
    item_id: string;        // UUID do catálogo, obrigatório
    is_checked: boolean;    // obrigatório
    note?: string;          // ≤ 500 chars
  }>;
}
```

> ⚠️ **Não envie `user_id` no body.** Ele sai do Bearer token. Qualquer
> `user_id` que vier no JSON é silenciosamente ignorado.

### Comportamento por item

| Caso                                                     | O que o backend faz                          |
| -------------------------------------------------------- | -------------------------------------------- |
| `is_checked: true`, item **já estava** marcado nesse dia | Preserva o `checked_at` anterior.            |
| `is_checked: true`, item **novo** ou estava desmarcado   | Seta `checked_at = NOW()`.                   |
| `is_checked: false`                                      | Zera `checked_at` (`null`).                  |
| Item omitido do array                                    | Some do dia (= desmarcado, sem nota).        |
| `item_id` repetido no array                              | `422 VALIDATION_ERROR` (`items[i].item_id`). |
| `item_id` inválido (não-UUID)                            | `422 VALIDATION_ERROR`.                      |
| `note` > 500 chars                                       | `422 VALIDATION_ERROR`.                      |

### Exemplo — salvando o dia de hoje (stand)

```bash
curl -X PUT "http://localhost:8080/api/v1/stand-check-activity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21", "is_checked": true },
      { "item_id": "9d9c1e9a-3b1f-4d8a-9b1f-6f0d1d2a3b4c", "is_checked": true, "note": "faltando 1 cadeira" },
      { "item_id": "e1f2a3b4-5c6d-7e8f-9012-3456789abcde", "is_checked": false }
    ]
  }'
```

### Exemplo — salvando um dia específico (daily)

```bash
curl -X PUT "http://localhost:8080/api/v1/check-items-daily-activity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "day":   "2026-04-23",
    "items": [
      { "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21", "is_checked": true }
    ]
  }'
```

### Resposta — `200 OK`

A linha persistida (já com `checked_at` populado pelo servidor):

```json
{
  "id": "5b9f0f1a-1aaa-4bbb-8ccc-1d2e3f4a5b6c",
  "user_id": "08082cb0-d0ba-48ad-9ef4-4d94c0e9aac0",
  "day": "2026-04-23T00:00:00Z",
  "items": [
    {
      "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
      "is_checked": true,
      "checked_at": "2026-04-23T14:00:00Z",
      "note": null
    },
    {
      "item_id": "9d9c1e9a-3b1f-4d8a-9b1f-6f0d1d2a3b4c",
      "is_checked": true,
      "checked_at": "2026-04-23T14:00:00Z",
      "note": "faltando 1 cadeira"
    }
  ],
  "created_at": "2026-04-23T14:00:00Z",
  "updated_at": "2026-04-23T14:00:00Z"
}
```

---

## 3. Visualizar um dia específico (com totais)

```
GET /api/v1/stand-check-activity/day?day=YYYY-MM-DD
GET /api/v1/check-items-daily-activity/day?day=YYYY-MM-DD
```

`day` é opcional (default = hoje BR). Devolve o catálogo ativo mesclado
com o estado salvo na linha JSONB do dia + totais.

### Resposta — `200 OK`

```json
{
  "user_id": "08082cb0-d0ba-48ad-9ef4-4d94c0e9aac0",
  "day": "2026-04-23T00:00:00Z",
  "total_items": 4,
  "checked_count": 2,
  "items": [
    {
      "item": {
        "id": "...",
        "code": "ranking_tv",
        "label": "...",
        "icon_name": "BarChart3",
        "display_order": 10,
        "is_active": true,
        "created_at": "...",
        "updated_at": "..."
      },
      "is_checked": true,
      "checked_at": "2026-04-23T09:00:00Z",
      "note": null
    },
    {
      "item": {
        "id": "...",
        "code": "cobrar_recep",
        "label": "...",
        "icon_name": "UserCheck",
        "display_order": 20,
        "is_active": true,
        "created_at": "...",
        "updated_at": "..."
      },
      "is_checked": false,
      "checked_at": null,
      "note": null
    }
  ]
}
```

> Diferente do GET do catálogo (item 1/5) — que devolve a lista **flat**
> com os campos do item embutidos —, este endpoint envelopa cada entrada
> em `{ item, is_checked, checked_at, note }`. É a forma rica para a tela
> de "histórico" / "ver dia específico".

---

## 4. Histórico (resumo por dia)

```
GET /api/v1/stand-check-activity/history?days=30
GET /api/v1/check-items-daily-activity/history?days=30
```

### Modos de range

| Query                            | Significado             |
| -------------------------------- | ----------------------- |
| _(sem parâmetros)_               | Últimos 30 dias         |
| `?days=N` (1..366)               | Últimos N dias até hoje |
| `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Range explícito         |

### Resposta — `200 OK`

Array com **uma linha por dia em que o usuário tem registro** (dias sem
linha não aparecem):

```json
[
  { "day": "2026-04-25T00:00:00Z", "total_items": 22, "checked_count": 18 },
  { "day": "2026-04-24T00:00:00Z", "total_items": 22, "checked_count": 22 },
  { "day": "2026-04-23T00:00:00Z", "total_items": 22, "checked_count": 15 }
]
```

- `total_items` reflete o catálogo **ativo no momento da query** (não é histórico).
- `checked_count` conta apenas elementos do array com `is_checked=true`.
- Ordenação: `day DESC`.

---

## Fluxo de tela end-to-end

```
1.  Front abre a tela
        │
        ▼
2.  GET /api/v1/<stand-check-items | check-items-daily>
        │   → array de items (flat) com is_checked/checked_at/note de hoje
        ▼
3.  Renderiza a lista. Toggles atualizam estado LOCAL apenas.
        │
        ▼
4.  Usuário clica "Salvar" (ou debounce)
        │
        ▼
5.  PUT /api/v1/<stand-check-activity | check-items-daily-activity>
        body: { items: [{item_id, is_checked, note?}, ...] }
        (user_id sai do JWT — não vai no body)
        │   → resposta com a linha persistida (checked_at preenchido)
        ▼
6.  Reidrata o estado local com a resposta (sincroniza checked_at).
```

> 🚫 **Não dispare PUT por toggle** — debounce ou "Salvar" explícito é
> melhor. Cada PUT reescreve o array inteiro.
> 🚫 **Não envie array parcial** — quem não estiver no array some.

---

## TypeScript types (sugestão)

Os contratos são idênticos entre os dois módulos. Você pode reusar os mesmos
types — só a URL do fetch muda.

```ts
// ── 1. GET /<...>-check-items / /check-items-daily ───────────────────
type CheckItemWithCheck = {
  // catálogo
  id: string; // UUID
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // estado de hoje (server-side)
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
};

// ── 2. PUT /<...>-check-activity ─────────────────────────────────────
type ReplaceActivityBody = {
  // SEM user_id — vem do JWT no servidor
  day?: string; // YYYY-MM-DD. Default: hoje (BR)
  items: Array<{
    item_id: string; // UUID
    is_checked: boolean;
    note?: string;
  }>;
};

type ActivityEntry = {
  item_id: string;
  is_checked: boolean;
  checked_at: string | null; // server-managed
  note: string | null;
};

type Activity = {
  id: string;
  user_id: string;
  day: string; // ISO 8601, 00:00 UTC
  items: ActivityEntry[];
  created_at: string;
  updated_at: string;
};

// ── 3. GET /<...>/day ─────────────────────────────────────────────────
type DayView = {
  user_id: string;
  day: string;
  total_items: number;
  checked_count: number;
  items: Array<{
    item: CheckItemWithCheck; // sem is_checked/checked_at/note no item
    is_checked: boolean;
    checked_at: string | null;
    note: string | null;
  }>;
};

// ── 4. GET /<...>/history ─────────────────────────────────────────────
type DaySummary = {
  day: string;
  total_items: number;
  checked_count: number;
};
```

---

## Pseudocódigo React (genérico — vale para os dois)

```ts
type Module = "stand" | "daily";

const paths = {
  stand: {
    items: "/api/v1/stand-check-items",
    activity: "/api/v1/stand-check-activity",
  },
  daily: {
    items: "/api/v1/check-items-daily",
    activity: "/api/v1/check-items-daily-activity",
  },
};

async function loadToday(mod: Module, token: string) {
  return fetch(paths[mod].items, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()) as Promise<CheckItemWithCheck[]>;
}

async function save(mod: Module, token: string, items: CheckItemWithCheck[]) {
  const body: ReplaceActivityBody = {
    items: items.map((it) => ({
      item_id: it.id,
      is_checked: it.is_checked,
      note: it.note ?? undefined,
    })),
  };
  return fetch(paths[mod].activity, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }).then((r) => r.json()) as Promise<Activity>;
}
```

---

## Formato padrão de erro

```json
{
  "error": "<mensagem humana>",
  "code": "<ENUM_DE_ERRO>",
  "fields": { "<campo>": ["<motivo 1>", "..."] }
}
```

`fields` só aparece em `422 VALIDATION_ERROR`.

| `code`             | HTTP  | Significado                              |
| ------------------ | ----- | ---------------------------------------- |
| `BAD_REQUEST`      | `400` | Body inválido ou parâmetro mal formatado |
| `UNAUTHORIZED`     | `401` | Bearer token ausente ou inválido         |
| `VALIDATION_ERROR` | `422` | Falha de validação de campo              |
| `INTERNAL_ERROR`   | `500` | Erro inesperado no servidor              |

### Exemplo de erro 422

```json
{
  "error": "validation failed",
  "code": "VALIDATION_ERROR",
  "fields": {
    "items[0].item_id": ["must be a valid UUID"],
    "items[2].item_id": ["must be unique within items"],
    "items[3].note": ["must be 500 characters or fewer"]
  }
}
```

---

## Onde isto vive no banco

```sql
-- ── STAND ────────────────────────────────────────────────────────────
CREATE TABLE stand_check_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40)  NOT NULL UNIQUE,
  label         VARCHAR(160) NOT NULL,
  icon_name     VARCHAR(40)  NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE stand_check_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(64)  NOT NULL,
  day         DATE         NOT NULL,
  items       JSONB        NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, day)
);

-- ── DAILY ────────────────────────────────────────────────────────────
CREATE TABLE check_items_daily (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40)  NOT NULL UNIQUE,
  label         VARCHAR(160) NOT NULL,
  icon_name     VARCHAR(40)  NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE check_items_daily_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(64)  NOT NULL,
  day         DATE         NOT NULL,
  items       JSONB        NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, day)
);
```

Scripts:

- [db/sql/stand_check_items.sql](../db/sql/stand_check_items.sql)
- [db/sql/stand_check_activity.sql](../db/sql/stand_check_activity.sql)
- [db/sql/check_items_daily.sql](../db/sql/check_items_daily.sql)
- [db/sql/check_items_daily_activity.sql](../db/sql/check_items_daily_activity.sql)

---

## Tabela de equivalência (stand ↔ daily)

| Conceito                       | Stand                                  | Daily                                        |
| ------------------------------ | -------------------------------------- | -------------------------------------------- |
| Tabela do catálogo             | `stand_check_items`                    | `check_items_daily`                          |
| Tabela da atividade            | `stand_check_activity`                 | `check_items_daily_activity`                 |
| GET catálogo (com estado hoje) | `/api/v1/stand-check-items`            | `/api/v1/check-items-daily`                  |
| PUT atividade do dia           | `/api/v1/stand-check-activity`         | `/api/v1/check-items-daily-activity`         |
| GET dia específico             | `/api/v1/stand-check-activity/day`     | `/api/v1/check-items-daily-activity/day`     |
| GET histórico                  | `/api/v1/stand-check-activity/history` | `/api/v1/check-items-daily-activity/history` |
| Body do PUT                    | `ReplaceStandCheckActivityRequest`     | `ReplaceCheckItemsDailyActivityRequest`      |

> Os dois módulos compartilham 100% das regras: validação, tratamento de
> `checked_at`, formato de resposta, formato de erro, fuso horário (BR),
> upsert idempotente.

---

## Documentos relacionados

- [stand-check-items.md](./stand-check-items.md) — CRUD admin do catálogo stand
- [stand-check-activity.md](./stand-check-activity.md) — Detalhes da atividade do stand
- [auth-frontend-integration.md](./auth-frontend-integration.md) — Fluxo de auth + Bearer token

# Check Items Award — Integração Front-end

Doc unificada para implementar a tela de checklist **award** (cerimônia /
premiação). Cobre **os endpoints** que o front precisa:

| #   | Método | Path                                                    | Para quê                                                                |
| --- | ------ | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `GET`  | `/api/v1/check-items-award`                             | Carregar o catálogo (ativos) + estado de check de **hoje**. Sem params. |
| 2   | `PUT`  | `/api/v1/check-items-award-activity`                    | Salvar (criar OU atualizar) os checks de um dia específico.             |
| 3   | `GET`  | `/api/v1/check-items-award-activity/day?day=YYYY-MM-DD` | Ler o dia específico (com totais).                                      |
| 4   | `GET`  | `/api/v1/check-items-award-activity/history?days=30`    | Resumo (day, total, checked) por dia em que existe linha persistida.    |

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Auth:** Bearer token (header `Authorization: Bearer <jwt>`).

> ℹ️ Esta doc é **task-oriented** — fluxo de tela. Para a **doc geral**
> que descreve os três módulos de checklist (stand, daily, award) lado a
> lado, veja [checklists-integration.md](./checklists-integration.md).

---

## Modelo mental

- O **catálogo** é a tabela `check_items_award` — uma linha por item, com `id` UUID estável.
- A **atividade** é a tabela `check_items_award_activity` — **uma linha por `(user_id, day)`** com um array JSONB `items` que guarda quais itens foram marcados naquele dia, quando, e com qual nota.
- O `user_id` vem **sempre do JWT** (Bearer token) — em GET, PUT ou history. O front **não envia** esse campo. Se enviar, é ignorado. Isso evita que um usuário grave em nome de outro e garante consistência entre PUT (escrita) e GET (leitura).
- A granularidade é **diária**. Cada dia tem sua foto independente.
- O conceito de "dia" é em **America/Sao_Paulo (BR)**, não UTC.

```
┌──────────────────────────┐         ┌──────────────────────────────────────┐
│ check_items_award        │         │ check_items_award_activity           │
│  (catálogo / admin)      │         │  (1 linha por user_id + day)         │
│                          │         │                                      │
│  id, code, label,        │ ◄──┐    │  id, user_id, day, items (JSONB)     │
│  icon_name,              │    │    │                                      │
│  display_order,          │    │    │  items[*]:                           │
│  is_active               │    └────│    item_id (UUID),                   │
└──────────────────────────┘         │    is_checked, checked_at, note      │
                                     └──────────────────────────────────────┘
```

---

## Catálogo seed (vem populado pelo SQL)

| code         | label                                           | icon_name       |
| ------------ | ----------------------------------------------- | --------------- |
| `bexigas`    | Bexigas compradas e prêmios dentro (indicações) | `PartyPopper`   |
| `premios`    | Prêmios embalados                               | `Gift`          |
| `sorteio`    | Roleta preparada                                | `Rotate3d`      |
| `sino_cerim` | Sino da cerimônia pronto                        | `Bell`          |
| `fotos`      | Câmera para registrar                           | `Camera`        |
| `treino`     | Treinamento preparado (terça/quinta)            | `BookOpenCheck` |
| `dep`        | Lista de aniversariantes                        | `ClipboardList` |

> Os ícones (`icon_name`) seguem a convenção do **lucide-react** — o front
> só precisa importar o componente com o mesmo nome.

---

## 1. Carregar a tela do dia

```
GET /api/v1/check-items-award
```

Devolve **só os itens ATIVOS** do catálogo, cada um já com o estado de
check do **dia de hoje (BR)** para o usuário do JWT. É o único request
que o front precisa fazer ao abrir a tela.

### Query params

**Nenhum.** O endpoint não aceita parâmetros — o filtro `is_active=true`
e o dia (=hoje BR) são fixos. O front filtra/destaca localmente os itens
com `is_checked: true` se quiser separar marcados de não-marcados na UI.

### Exemplo

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/check-items-award"
```

### Resposta — `200 OK`

```json
[
  {
    "id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
    "code": "bexigas",
    "label": "Bexigas compradas e prêmios dentro (indicações)",
    "icon_name": "PartyPopper",
    "display_order": 10,
    "is_active": true,
    "created_at": "2026-04-26T13:05:11.123456Z",
    "updated_at": "2026-04-26T13:05:11.123456Z",

    "is_checked": true,
    "checked_at": "2026-04-26T09:13:20Z",
    "note": null
  },
  {
    "id": "9d9c1e9a-3b1f-4d8a-9b1f-6f0d1d2a3b4c",
    "code": "premios",
    "label": "Prêmios embalados",
    "icon_name": "Gift",
    "display_order": 20,
    "is_active": true,
    "created_at": "2026-04-26T13:06:00.000000Z",
    "updated_at": "2026-04-26T13:06:00.000000Z",

    "is_checked": false,
    "checked_at": null,
    "note": null
  }
]
```

### Notas para o front

- Cada item já vem com `is_checked` / `checked_at` / `note` — **não precisa fazer um request separado** pra resolver o estado.
- O endpoint sempre retorna **hoje (BR — America/Sao_Paulo)**. Para outros dias, use `GET /api/v1/check-items-award-activity/day?day=YYYY-MM-DD`.
- O backend já filtra apenas `is_active=true` — itens desativados não aparecem.
- A ordem segue `display_order ASC, created_at ASC` — renderize na ordem que vier.
- `checked_at` é **server-managed** — o front nunca precisa montar isso.
- Para destacar/separar marcados na UI, faça o parse local: `items.filter(it => it.is_checked)`.

### Erros

| Status | `code`           | Quando           |
| ------ | ---------------- | ---------------- |
| `401`  | `UNAUTHORIZED`   | Sem Bearer token |
| `500`  | `INTERNAL_ERROR` | Falha no banco   |

---

## 2. Salvar os checks (criar ou atualizar)

```
PUT /api/v1/check-items-award-activity
```

**Único endpoint** para salvar — faz upsert idempotente:

- Se ainda não existe linha pra `(user_id, day)`, **cria**.
- Se já existe, **substitui** o array `items` pelo que veio no body.

> ⚠️ **É replace-all.** Itens omitidos do `items` somem do array (somem
> = ficam desmarcados). Sempre envie a foto **completa** do dia.

### Body — `ReplaceCheckItemsAwardActivityRequest`

```ts
{
  day?: string;             // YYYY-MM-DD. Default: hoje (BR — America/Sao_Paulo)
  items: Array<{
    item_id: string;        // UUID do check_items_award, obrigatório
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

### Exemplo — salvando o dia de hoje

```bash
curl -X PUT "http://localhost:8080/api/v1/check-items-award-activity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21", "is_checked": true },
      { "item_id": "9d9c1e9a-3b1f-4d8a-9b1f-6f0d1d2a3b4c", "is_checked": true, "note": "10 prêmios embalados" },
      { "item_id": "e1f2a3b4-5c6d-7e8f-9012-3456789abcde", "is_checked": false }
    ]
  }'
```

### Exemplo — salvando um dia específico

```bash
curl -X PUT "http://localhost:8080/api/v1/check-items-award-activity" \
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
  "day": "2026-04-26T00:00:00Z",
  "items": [
    {
      "item_id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
      "is_checked": true,
      "checked_at": "2026-04-26T14:00:00Z",
      "note": null
    },
    {
      "item_id": "9d9c1e9a-3b1f-4d8a-9b1f-6f0d1d2a3b4c",
      "is_checked": true,
      "checked_at": "2026-04-26T14:00:00Z",
      "note": "10 prêmios embalados"
    },
    {
      "item_id": "e1f2a3b4-5c6d-7e8f-9012-3456789abcde",
      "is_checked": false,
      "checked_at": null,
      "note": null
    }
  ],
  "created_at": "2026-04-26T14:00:00Z",
  "updated_at": "2026-04-26T14:00:00Z"
}
```

### Erros

| Status | `code`             | Quando                                 |
| ------ | ------------------ | -------------------------------------- |
| `400`  | `BAD_REQUEST`      | JSON inválido ou `day` mal formatado   |
| `401`  | `UNAUTHORIZED`     | Sem Bearer token                       |
| `422`  | `VALIDATION_ERROR` | item_id inválido/duplicado, note > 500 |
| `500`  | `INTERNAL_ERROR`   | Falha no banco                         |

#### Exemplo de erro 422

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

## 3. Ler um dia específico (com totais)

```
GET /api/v1/check-items-award-activity/day?day=YYYY-MM-DD
```

`day` é opcional (default = hoje BR). Devolve o catálogo ativo mesclado
com o estado salvo na linha JSONB do dia + totais.

### Resposta — `200 OK`

```json
{
  "user_id": "08082cb0-d0ba-48ad-9ef4-4d94c0e9aac0",
  "day": "2026-04-23T00:00:00Z",
  "total_items": 7,
  "checked_count": 4,
  "items": [
    {
      "item": {
        "id": "...",
        "code": "bexigas",
        "label": "...",
        "icon_name": "PartyPopper",
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
        "code": "premios",
        "label": "...",
        "icon_name": "Gift",
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

> Diferente do GET do catálogo (item 1) — que devolve a lista **flat**
> com os campos do item embutidos —, este endpoint envelopa cada entrada
> em `{ item, is_checked, checked_at, note }`. É a forma rica para a tela
> de "histórico" / "ver dia específico".

---

## 4. Histórico (resumo por dia)

```
GET /api/v1/check-items-award-activity/history?days=30
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
  { "day": "2026-04-26T00:00:00Z", "total_items": 7, "checked_count": 6 },
  { "day": "2026-04-25T00:00:00Z", "total_items": 7, "checked_count": 7 },
  { "day": "2026-04-24T00:00:00Z", "total_items": 7, "checked_count": 5 }
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
2.  GET /api/v1/check-items-award
        │   → array de items, cada um com is_checked/checked_at/note de hoje
        ▼
3.  Renderiza a lista. Toggles atualizam estado LOCAL apenas.
        │
        ▼
4.  Usuário clica "Salvar" (ou debounce)
        │
        ▼
5.  PUT /api/v1/check-items-award-activity
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

```ts
// ── 1. GET /check-items-award ────────────────────────────────────────
type CheckItemAwardWithCheck = {
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

// ── 2. PUT /check-items-award-activity ───────────────────────────────
type ReplaceCheckItemsAwardActivityBody = {
  // SEM user_id — vem do JWT no servidor
  day?: string; // YYYY-MM-DD. Default: hoje (BR)
  items: Array<{
    item_id: string; // UUID
    is_checked: boolean;
    note?: string;
  }>;
};

type CheckItemsAwardActivityEntry = {
  item_id: string;
  is_checked: boolean;
  checked_at: string | null; // server-managed
  note: string | null;
};

type CheckItemsAwardActivity = {
  id: string;
  user_id: string;
  day: string; // ISO 8601, 00:00 UTC
  items: CheckItemsAwardActivityEntry[];
  created_at: string;
  updated_at: string;
};

// ── 3. GET /check-items-award-activity/day ───────────────────────────
type CheckItemsAwardActivityDayView = {
  user_id: string;
  day: string;
  total_items: number;
  checked_count: number;
  items: Array<{
    item: Omit<CheckItemAwardWithCheck, "is_checked" | "checked_at" | "note">;
    is_checked: boolean;
    checked_at: string | null;
    note: string | null;
  }>;
};

// ── 4. GET /check-items-award-activity/history ───────────────────────
type DaySummary = {
  day: string;
  total_items: number;
  checked_count: number;
};
```

---

## Exemplo de implementação (pseudocódigo React)

```ts
// Carregar (sem query params — backend filtra is_active=true e dia=hoje BR)
const items = (await fetch("/api/v1/check-items-award", {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json())) as CheckItemAwardWithCheck[];

setLocalState(items); // já vem com is_checked / note do dia

// Se quiser destacar marcados na UI, parse local:
const marcados = items.filter((it) => it.is_checked);
const pendentes = items.filter((it) => !it.is_checked);

// Toggle (apenas estado local)
const toggle = (id: string) => {
  setLocalState((prev) =>
    prev.map((it) => (it.id === id ? { ...it, is_checked: !it.is_checked } : it)),
  );
};

// Salvar (debounce ou botão) — SEM user_id, vem do JWT
const save = async () => {
  const body: ReplaceCheckItemsAwardActivityBody = {
    items: localState.map((it) => ({
      item_id: it.id,
      is_checked: it.is_checked,
      note: it.note ?? undefined,
    })),
  };
  const updated = (await fetch("/api/v1/check-items-award-activity", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }).then((r) => r.json())) as CheckItemsAwardActivity;

  // resincroniza checked_at vindos do server
  const byID = new Map(updated.items.map((e) => [e.item_id, e]));
  setLocalState((prev) =>
    prev.map((it) => {
      const e = byID.get(it.id);
      return e ? { ...it, is_checked: e.is_checked, checked_at: e.checked_at, note: e.note } : it;
    }),
  );
};
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

---

## Onde isto vive no banco

```sql
-- catálogo (admin gerencia, vem populado pelo seed SQL)
CREATE TABLE check_items_award (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40)  NOT NULL UNIQUE,
  label         VARCHAR(160) NOT NULL,
  icon_name     VARCHAR(40)  NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- atividade do usuário (1 linha por user + day; items em JSONB)
CREATE TABLE check_items_award_activity (
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

- [db/sql/check_items_award.sql](../db/sql/check_items_award.sql)
- [db/sql/check_items_award_activity.sql](../db/sql/check_items_award_activity.sql)

---

## Documentos relacionados

- [checklists-integration.md](./checklists-integration.md) — Doc geral cobrindo os três módulos (stand, daily, award) lado a lado
- [stand-check-items.md](./stand-check-items.md) — CRUD admin do catálogo stand (referência para o admin do award também)
- [auth-frontend-integration.md](./auth-frontend-integration.md) — Fluxo de auth + Bearer token

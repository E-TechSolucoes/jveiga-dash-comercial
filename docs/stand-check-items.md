# Stand Check Items API

CRUD para itens de checklist de stand (banner, maquete, etc.). Cada item é único pelo `code`.

> ⚠️ **GET / (List)** devolve, além dos campos do item, o estado de check
> **do dia atual** para o usuário autenticado — lê `stand_check_activity`
> filtrando por `(user_id, hoje em UTC)`. Veja o endpoint #1.
> Os demais endpoints (criar/atualizar/deletar/buscar por id) seguem
> retornando só o item puro, sem estado.

- **Base path:** `/api/v1/stand-check-items`
- **Content-Type:** `application/json`
- **Auth:** Bearer token (mesmo middleware das demais rotas autenticadas)

---

## Recurso

### Schema do registro (`StandCheckItem`)

| Campo           | Tipo            | Notas                                                       |
| --------------- | --------------- | ----------------------------------------------------------- |
| `id`            | `string` (UUID) | Gerado pelo banco                                           |
| `code`          | `string`        | Código curto, ex: `"banner"`, `"maquete"` (max 40, único)   |
| `label`         | `string`        | Rótulo exibido ao usuário (max 160)                         |
| `icon_name`     | `string`        | Nome do ícone Lucide, ex: `"Flag"`, `"LayoutGrid"` (max 40) |
| `display_order` | `int16`         | Ordem de exibição (default `0`)                             |
| `is_active`     | `boolean`       | Se o item está ativo (default `true`)                       |
| `created_at`    | `string` (ISO)  | UTC, RFC3339                                                |
| `updated_at`    | `string` (ISO)  | UTC, RFC3339                                                |

### Constraints do banco

- `UNIQUE (code)` — não pode haver dois itens com o mesmo `code`. Tentativa retorna **409 Conflict**.
- Index parcial em `(display_order) WHERE is_active = TRUE` para listagens rápidas dos itens ativos.

---

## Endpoints

### 1. Listar itens (com estado de check do dia atual)

```
GET /api/v1/stand-check-items
```

Devolve o catálogo enriquecido com o estado de check do **usuário
autenticado** para o **dia de hoje** (UTC). O backend lê
`stand_check_activity` filtrando por `(user_id, hoje)` e mescla cada item
com o entry correspondente. Itens nunca tocados no dia vêm com
`is_checked: false`, `checked_at: null`, `note: null`.

#### Query params (todos opcionais)

| Param       | Tipo      | Descrição                            |
| ----------- | --------- | ------------------------------------ |
| `is_active` | `boolean` | `true` / `false` — filtra por status |

Ordenação: `display_order ASC, created_at ASC`.

#### Exemplo de request

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/stand-check-items?is_active=true"
```

#### Resposta — `200 OK`

```json
[
  {
    "id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
    "code": "banner",
    "label": "Banner principal",
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
    "label": "Maquete física",
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

> Para passar um dia específico (não o "hoje"), use o endpoint
> `GET /api/v1/stand-check-activity/day?day=YYYY-MM-DD` — esse aceita
> data arbitrária. O `GET /stand-check-items` é sempre **hoje (UTC)**.

#### Erros

| Status | `code`           | Quando                        |
| ------ | ---------------- | ----------------------------- |
| `400`  | `BAD_REQUEST`    | `is_active` com tipo inválido |
| `401`  | `UNAUTHORIZED`   | Sem Bearer token              |
| `500`  | `INTERNAL_ERROR` | Falha no banco                |

---

### 2. Buscar item por ID

```
GET /api/v1/stand-check-items/{id}
```

#### Path params

| Param | Tipo            | Descrição  |
| ----- | --------------- | ---------- |
| `id`  | `string` (UUID) | ID do item |

#### Exemplo

```bash
curl "http://localhost:8080/api/v1/stand-check-items/0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21"
```

#### Resposta — `200 OK`

```json
{
  "id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
  "code": "banner",
  "label": "Banner principal",
  "icon_name": "Flag",
  "display_order": 0,
  "is_active": true,
  "created_at": "2026-04-25T13:05:11.123456Z",
  "updated_at": "2026-04-25T13:05:11.123456Z"
}
```

#### Erros

| Status | `code`           | Quando                            |
| ------ | ---------------- | --------------------------------- |
| `404`  | `NOT_FOUND`      | UUID inválido ou item inexistente |
| `500`  | `INTERNAL_ERROR` | Falha no banco                    |

---

### 3. Criar item

```
POST /api/v1/stand-check-items
```

#### Body — `CreateStandCheckItemRequest`

| Campo           | Tipo      | Obrigatório | Regras                          |
| --------------- | --------- | ----------- | ------------------------------- |
| `code`          | `string`  | sim         | não-vazio, max 40, único        |
| `label`         | `string`  | sim         | não-vazio, max 160              |
| `icon_name`     | `string`  | sim         | não-vazio, max 40 (nome Lucide) |
| `display_order` | `int16`   | não         | default `0`                     |
| `is_active`     | `boolean` | não         | default `true`                  |

#### Exemplo de request

```bash
curl -X POST "http://localhost:8080/api/v1/stand-check-items" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "banner",
    "label": "Banner principal",
    "icon_name": "Flag",
    "display_order": 0,
    "is_active": true
  }'
```

#### Resposta — `201 Created`

```json
{
  "id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
  "code": "banner",
  "label": "Banner principal",
  "icon_name": "Flag",
  "display_order": 0,
  "is_active": true,
  "created_at": "2026-04-25T13:05:11.123456Z",
  "updated_at": "2026-04-25T13:05:11.123456Z"
}
```

#### Erros

| Status | `code`             | Quando                                 |
| ------ | ------------------ | -------------------------------------- |
| `400`  | `BAD_REQUEST`      | JSON malformado                        |
| `409`  | `CONFLICT`         | `code` já existe                       |
| `422`  | `VALIDATION_ERROR` | Campos obrigatórios ausentes/inválidos |
| `500`  | `INTERNAL_ERROR`   | Falha no banco                         |

#### Exemplo de erro 422 (validação)

```json
{
  "error": "validation failed",
  "code": "VALIDATION_ERROR",
  "fields": {
    "code": ["is required"],
    "label": ["must be 160 characters or fewer"]
  }
}
```

#### Exemplo de erro 409 (conflito)

```json
{
  "error": "stand_check_item with this code already exists",
  "code": "CONFLICT"
}
```

---

### 4. Atualizar item (partial update)

```
PUT /api/v1/stand-check-items/{id}
```

> ⚠️ Apesar do verbo ser `PUT`, a semântica é **PATCH parcial**: qualquer campo
> ausente do body é mantido como está. Para definir `is_active` como `false`,
> envie explicitamente `"is_active": false`.

#### Path params

| Param | Tipo            |
| ----- | --------------- |
| `id`  | `string` (UUID) |

#### Body — `UpdateStandCheckItemRequest` (todos os campos opcionais)

| Campo           | Tipo      | Regras                   |
| --------------- | --------- | ------------------------ |
| `code`          | `string`  | não-vazio, max 40, único |
| `label`         | `string`  | não-vazio, max 160       |
| `icon_name`     | `string`  | não-vazio, max 40        |
| `display_order` | `int16`   | qualquer int16           |
| `is_active`     | `boolean` | `true`/`false`           |

#### Exemplo de request

```bash
curl -X PUT "http://localhost:8080/api/v1/stand-check-items/0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Banner do estande principal",
    "display_order": 5
  }'
```

#### Resposta — `200 OK`

```json
{
  "id": "0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21",
  "code": "banner",
  "label": "Banner do estande principal",
  "icon_name": "Flag",
  "display_order": 5,
  "is_active": true,
  "created_at": "2026-04-25T13:05:11.123456Z",
  "updated_at": "2026-04-25T13:42:09.000000Z"
}
```

#### Erros

| Status | `code`             | Quando                            |
| ------ | ------------------ | --------------------------------- |
| `400`  | `BAD_REQUEST`      | JSON malformado                   |
| `404`  | `NOT_FOUND`        | UUID inválido ou item inexistente |
| `409`  | `CONFLICT`         | Novo `code` colide                |
| `422`  | `VALIDATION_ERROR` | Algum campo inválido              |
| `500`  | `INTERNAL_ERROR`   | Falha no banco                    |

---

### 5. Deletar item

```
DELETE /api/v1/stand-check-items/{id}
```

#### Path params

| Param | Tipo            |
| ----- | --------------- |
| `id`  | `string` (UUID) |

#### Exemplo

```bash
curl -X DELETE "http://localhost:8080/api/v1/stand-check-items/0f4f0c84-2bc4-4f9d-a3a6-0c1f6b9e7b21"
```

#### Resposta — `204 No Content`

_(corpo vazio)_

#### Erros

| Status | `code`           | Quando                            |
| ------ | ---------------- | --------------------------------- |
| `404`  | `NOT_FOUND`      | UUID inválido ou item inexistente |
| `500`  | `INTERNAL_ERROR` | Falha no banco                    |

---

## Formato padrão de erro

Todo erro é retornado com `Content-Type: application/json` no formato:

```json
{
  "error": "<mensagem humana>",
  "code": "<ENUM_DE_ERRO>",
  "fields": {
    "<campo>": ["<motivo 1>", "<motivo 2>"]
  }
}
```

`fields` só aparece em erros `422 VALIDATION_ERROR`.

### Códigos de erro possíveis

| `code`             | HTTP  | Significado                              |
| ------------------ | ----- | ---------------------------------------- |
| `BAD_REQUEST`      | `400` | Body inválido ou parâmetro mal formatado |
| `NOT_FOUND`        | `404` | Item não existe                          |
| `CONFLICT`         | `409` | Violação de unique constraint            |
| `VALIDATION_ERROR` | `422` | Falha de validação de campo              |
| `INTERNAL_ERROR`   | `500` | Erro inesperado no servidor              |

---

## Tabela no banco

```sql
CREATE TABLE stand_check_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40)  NOT NULL UNIQUE,
  label         VARCHAR(160) NOT NULL,
  icon_name     VARCHAR(40)  NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stand_check_items_order
  ON stand_check_items (display_order)
  WHERE is_active = TRUE;
```

Script pronto em [db/sql/stand_check_items.sql](../db/sql/stand_check_items.sql) — rodar direto no banco (psql/cliente).

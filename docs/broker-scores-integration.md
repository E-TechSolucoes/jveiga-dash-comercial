# Broker Scores — Frontend Integration

Per-broker scoring records for one **enterprise**, **reference date** and
**action**. Each row stores how many **points** that action is worth for
that broker on that date at that enterprise.

Table: `broker_scores`. Endpoints under `/api/v1/broker-scores`.
All require `Authorization: Bearer <jwt>`.

## Model

| field           | type         | notes                                                                     |
| --------------- | ------------ | ------------------------------------------------------------------------- |
| `id`            | uuid         | PK                                                                        |
| `broker_id`     | uuid         | FK → `field_brokers.id` (use `id` from `GET /api/v1/field-brokers/all`)   |
| `broker_nome`   | text         | **derived** (`field_brokers.nome` via INNER JOIN on GET list / GET by id) |
| `enterprise_id` | bigint       | business enterprise key (same id used across the system)                  |
| `scoring_date`  | date         | reference date (YYYY-MM-DD)                                               |
| `action`        | text         | scored action label (e.g. `"Active Capture"`, `"Visit"`)                  |
| `points`        | number (≥ 0) | score value; accepts one decimal (e.g. `0.5`)                             |
| `status`        | text (enum)  | `active` \| `inactive` \| `pending` (default `active`)                    |
| `created_at`    | timestamptz  | server-side                                                               |
| `updated_at`    | timestamptz  | server-side (`SET updated_at = NOW()` on UPDATE)                          |

**Natural key** (unique): `(broker_id, enterprise_id, scoring_date, action)`.

POST with multiple `enterprise_ids` creates **one row per enterprise** for
the same broker, date, action and points.

## Endpoints

### `GET /api/v1/broker-scores` — list

Documentação completa em **[broker-scores-list.md](./broker-scores-list.md)**.

---

### `POST /api/v1/broker-scores` — create

Creates **one row per** `enterprise_id` in the array.

**Body**:

```json
{
  "broker_id": "5d8b0a96-3d63-4f4f-9f64-7d4e2e0e10",
  "scoring_date": "2026-06-10",
  "enterprise_ids": [347, 348],
  "action": "Active Capture",
  "points": 5,
  "status": "active"
}
```

| field            | required | description               |
| ---------------- | -------- | ------------------------- |
| `broker_id`      | yes      | UUID from `field_brokers` |
| `scoring_date`   | yes      | `YYYY-MM-DD`              |
| `enterprise_ids` | yes      | ≥ 1 positive integer      |
| `action`         | yes      | non-empty text            |
| `points`         | yes      | number ≥ 0                |
| `status`         | no       | default `active`          |

**Response `201`**:

```json
{
  "items": [
    {
      "id": "...",
      "broker_id": "5d8b0a96-3d63-4f4f-9f64-7d4e2e0e0e10",
      "enterprise_id": 347,
      "scoring_date": "2026-06-10",
      "action": "Active Capture",
      "points": 5,
      "status": "active",
      "created_at": "2026-06-10T14:30:00Z",
      "updated_at": "2026-06-10T14:30:00Z"
    },
    {
      "id": "...",
      "broker_id": "5d8b0a96-3d63-4f4f-9f64-7d4e2e0e0e10",
      "enterprise_id": 348,
      "scoring_date": "2026-06-10",
      "action": "Active Capture",
      "points": 5,
      "status": "active",
      "created_at": "2026-06-10T14:30:00Z",
      "updated_at": "2026-06-10T14:30:00Z"
    }
  ]
}
```

**Errors**: `409` when the natural key already exists; `422` when `broker_id` is unknown.

---

### `DELETE /api/v1/broker-scores` — delete by natural key (query)

Always send all four key fields:

```http
DELETE /api/v1/broker-scores?broker_id=5d8b0a96-3d63-4f4f-9f64-7d4e2e0e0e10&enterprise_id=347&scoring_date=2026-06-10&action=Active%20Capture
```

| param           | required | description          |
| --------------- | -------- | -------------------- |
| `broker_id`     | yes      | broker UUID          |
| `enterprise_id` | yes      | single enterprise id |
| `scoring_date`  | yes      | `YYYY-MM-DD`         |
| `action`        | yes      | exact action label   |

**Response `204`** (no body). **Errors**: `404` when no matching row.

---

### `POST /api/v1/broker-scores/delete` — delete by natural key (body)

Same semantics as `DELETE` with query params — use when the client prefers JSON:

```json
{
  "broker_id": "5d8b0a96-3d63-4f4f-9f64-7d4e2e0e0e10",
  "enterprise_id": 347,
  "scoring_date": "2026-06-10",
  "action": "Active Capture"
}
```

**Response `204`**.

---

### `GET /api/v1/broker-scores/{id}` — get by UUID

**Response `200`**: single `BrokerScoreDTO`.

---

### `PATCH /api/v1/broker-scores/{id}` — partial update by UUID

```json
{
  "points": 10,
  "status": "inactive"
}
```

**Response `200`**: updated record.

---

## Manual SQL

**Tabela nova (CREATE completo):**

```bash
psql "$DATABASE_URL" -f db/sql/broker_scores.sql
```

**Banco que já tem `broker_scores` na versão antiga (ALTER idempotente):**

```bash
psql "$DATABASE_URL" -f db/sql/20260610_broker_scores_add_broker_and_enterprise_id.sql
```

Ou run migrations:

```bash
go run ./cmd/migrate up
```

## Backend file map

| Layer      | File                                                                                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema SQL | [db/sql/broker_scores.sql](../db/sql/broker_scores.sql)                                                                                                                                                                                            |
| Migrations | [20260610000000](../db/migrations/20260610000000_broker_scores.go), [20260610000100](../db/migrations/20260610000100_broker_scores_rename_columns.go), [20260610000200](../db/migrations/20260610000200_broker_scores_broker_and_enterprise_id.go) |
| Model      | [model/broker_score.go](../model/broker_score.go)                                                                                                                                                                                                  |
| DTOs       | [dto/broker_score.go](../dto/broker_score.go)                                                                                                                                                                                                      |
| Repository | [repository/postgres/broker_scores.go](../repository/postgres/broker_scores.go)                                                                                                                                                                    |
| Service    | [services/broker_score.go](../services/broker_score.go)                                                                                                                                                                                            |
| Handlers   | [handler/broker_score.go](../handler/broker_score.go)                                                                                                                                                                                              |
| Routes     | [application/routes.go](../application/routes.go)                                                                                                                                                                                                  |

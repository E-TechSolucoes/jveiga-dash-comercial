# Armas → Ações de Campo · Análise de Estrutura de Banco

Análise da sub-aba **Ações de Campo** (dentro da aba **Armas** do
dashboard comercial). Documento voltado ao backend para servir de base
na criação das tabelas e regras de negócio.

- **Tela referência:** [arsenal-tab.tsx](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx>)
  com filtro `"acao"` ativo (default da tela).
- **Modelo de domínio (mock):** [arsenal-data.ts](<../src/app/(dashboard)/dashboard/_components/arsenal-data.ts>)

> **Escopo:** apenas o que o usuário vê com o filtro **Ações de Campo**
> selecionado:
>
> - O bloco **Cadastro &amp; Performance do corretor**.
> - As **6 armas de campo**: Panfletagem, Portaria, Blitz Digital,
>   Evento Stand, Mutirão de Reativação, Celebração.
> - O **navegador de semana** + lista de execuções dia-a-dia.
>
> Treinamentos (Corujão, Alvo, Duelo, Sino, Roleplay) **estão fora deste
> escopo** — são outro filtro da mesma aba e podem ter modelagem própria.

---

## 1. O que a tela tem (mapa de campos)

Lendo a tela de cima para baixo:

### A. Filtro de tipo (read-only do front)

Não persiste — é só um seletor de visualização.

### B. Cadastro &amp; Performance do corretor

| Campo na tela              | Origem                        | Editável?       |
| -------------------------- | ----------------------------- | --------------- |
| Nome                       | input do form                 | sim             |
| Imobiliária                | input do form                 | sim             |
| Celular                    | input do form                 | sim             |
| Ind / Vis / Pas / PA / Ven | inputs numéricos da tabela    | sim (por linha) |
| Pts                        | **calculado**                 | não             |
| Nível                      | **calculado** a partir de Pts | não             |
| Botão "Remover" (lixeira)  | ação de exclusão              | —               |

> **`Pts` e `Nível` não são campos persistidos** — são derivados.
> Persistir cria risco de divergência (a UI re-calcula em tempo real
> sempre que `ind/vis/pas/pasA/vendas` ou as participações da semana
> mudam — ver [arsenal-tab.tsx:137](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx#L137>)).

### C. Navegador de semana

| Elemento                  | Significado                                             |
| ------------------------- | ------------------------------------------------------- |
| Semana N (1..52)          | número da semana ISO                                    |
| Intervalo (DD/MM — DD/MM) | derivado de `week_start`                                |
| "X validações"            | contador de execuções com `is_validated=true` na semana |

### D. Lista de armas (uma por arma de campo)

Para cada arma, ao expandir, aparecem **6 linhas (Seg–Sáb)**:

| Campo na linha do dia    | Tipo         | Quando é obrigatório                       |
| ------------------------ | ------------ | ------------------------------------------ |
| Local / endereço         | string       | sempre (é ação de campo, sempre tem local) |
| Corretores selecionados  | array de IDs | ≥ 1 ao validar                             |
| Botão Validar / Desfazer | flag boolean | `is_validated`                             |

---

## 2. Decisão de granularidade

| Agregado                                      | Controle por semana?           |
| --------------------------------------------- | ------------------------------ |
| Corretor (cadastro: nome, imob, cel)          | **NÃO** — global               |
| Estatísticas do corretor (ind/vis/pas/PA/ven) | **SIM** — por semana           |
| Catálogo das 6 ações de campo                 | **NÃO** — estático             |
| Execução de uma ação em um dia                | **SIM** — por semana e por dia |
| Participantes de cada execução                | herdado da execução            |

> **Por que separar estatísticas em uma tabela própria com semana**:
> os pontos do corretor são re-calculados **toda vez que a semana muda**
> na navegação ([arsenal-tab.tsx:140](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx#L140>)).
> Manter `ind/vis/pas/pasA/vendas` na tabela de cadastro tornaria os
> contadores cumulativos e perderia o sentido do ranking semanal —
> "como foi a Bia na semana 14?" viraria impossível de responder.
> Cadastro do corretor (nome / imobiliária / celular) continua sem
> semana, conforme você pediu.

---

## 3. Tabelas necessárias (4 tabelas)

```
field_actions              field_brokers
   (catálogo: 6 armas)        (cadastro global de corretor)
        │                            │
        │ 1                        1 │
        │                            │
        ▼ N                        N ▼
field_action_executions ───► field_action_participants
   (1 linha por                       ▲
    arma × week × weekday)            │
                                      │
                                      │
field_broker_weekly_stats ────────────┘
   (ind/vis/pas/pas_aprov/vendas
    por broker × week_start)
```

### 3.1 `field_actions` — catálogo (sem semana)

Uma linha por arma de campo. Estática, populada via seed. Permite
desativar uma arma sem deletar histórico.

| Coluna          | Tipo           | Notas                                                                         |
| --------------- | -------------- | ----------------------------------------------------------------------------- |
| `id`            | UUID PK        | gerado pelo banco                                                             |
| `code`          | VARCHAR(40) UQ | slug estável: `panfleta`, `portaria`, `blitz`, `evento`, `reativa`, `celebra` |
| `nome`          | VARCHAR(120)   | "Panfletagem", "Portaria" etc.                                                |
| `descricao`     | TEXT           | bullet do front                                                               |
| `resultado`     | VARCHAR(200)   | texto curto exibido no chip                                                   |
| `custo`         | VARCHAR(60)    | livre, ex: "R$ 200 a R$ 400" (pode ser nulo)                                  |
| `detalhe`       | TEXT           | parágrafo expandido                                                           |
| `icon_name`     | VARCHAR(40)    | nome lucide-react (`Megaphone`, `Sword`, etc.)                                |
| `accent`        | VARCHAR(10)    | cor da skin: `emerald`, `teal`, `violet`...                                   |
| `display_order` | INT            | ordem na lista                                                                |
| `is_active`     | BOOLEAN        | desativar = some da UI sem perder histórico                                   |
| `created_at`    | TIMESTAMPTZ    |                                                                               |
| `updated_at`    | TIMESTAMPTZ    |                                                                               |

### 3.2 `field_brokers` — cadastro do corretor (sem semana)

Entidade global. Reutilizada em todas as semanas.

| Coluna        | Tipo         | Notas                                             |
| ------------- | ------------ | ------------------------------------------------- |
| `id`          | UUID PK      |                                                   |
| `user_id`     | VARCHAR(64)  | dono do cadastro (vem do JWT)                     |
| `nome`        | VARCHAR(120) | obrigatório                                       |
| `imobiliaria` | VARCHAR(60)  | default `'—'` se vazio                            |
| `celular`     | VARCHAR(20)  | opcional, texto livre (`(11) 99999-9999`)         |
| `is_active`   | BOOLEAN      | `false` em vez de DELETE para preservar histórico |
| `created_at`  | TIMESTAMPTZ  |                                                   |
| `updated_at`  | TIMESTAMPTZ  |                                                   |

**Constraint**: `UNIQUE (user_id, nome)` — espelha a regra da UI
([arsenal-tab.tsx:153](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx#L153>)).

### 3.3 `field_broker_weekly_stats` — performance do corretor por semana

Os 5 contadores que aparecem na tabela de cadastro/performance.

| Coluna       | Tipo        | Notas                                  |
| ------------ | ----------- | -------------------------------------- |
| `id`         | UUID PK     |                                        |
| `user_id`    | VARCHAR(64) | escopo, do JWT                         |
| `broker_id`  | UUID FK     | → `field_brokers.id` ON DELETE CASCADE |
| `week_start` | DATE        | segunda-feira ISO                      |
| `ind`        | INT ≥ 0     | indicações                             |
| `vis`        | INT ≥ 0     | visitas                                |
| `pas`        | INT ≥ 0     | pastas abertas                         |
| `pas_aprov`  | INT ≥ 0     | pastas aprovadas                       |
| `vendas`     | INT ≥ 0     |                                        |
| `created_at` | TIMESTAMPTZ |                                        |
| `updated_at` | TIMESTAMPTZ |                                        |

**Constraints**:

- `UNIQUE (broker_id, week_start)` — uma linha por corretor por semana.
- `CHECK EXTRACT(ISODOW FROM week_start) = 1` — sempre segunda-feira.

### 3.4 `field_action_executions` — execução de uma arma num dia

O coração do controle por semana. **Uma linha por arma × semana × dia.**
Mesmo arma pode rodar segunda **e** quarta — são duas linhas.

| Coluna         | Tipo         | Notas                                           |
| -------------- | ------------ | ----------------------------------------------- |
| `id`           | UUID PK      |                                                 |
| `user_id`      | VARCHAR(64)  | escopo, do JWT                                  |
| `action_id`    | UUID FK      | → `field_actions.id` ON DELETE RESTRICT         |
| `week_start`   | DATE         | segunda-feira ISO                               |
| `weekday`      | SMALLINT     | 1=Seg ... 6=Sáb (a UI só renderiza 6 dias)      |
| `local`        | VARCHAR(200) | endereço/ponto da ação — obrigatório ao validar |
| `is_validated` | BOOLEAN      | flag do botão "Validar"                         |
| `validated_at` | TIMESTAMPTZ  | preenchido em `now()` quando valida             |
| `created_at`   | TIMESTAMPTZ  |                                                 |
| `updated_at`   | TIMESTAMPTZ  |                                                 |

**Constraints**:

- `UNIQUE (user_id, action_id, week_start, weekday)` — não duplica.
- `CHECK EXTRACT(ISODOW FROM week_start) = 1`
- `CHECK weekday BETWEEN 1 AND 6`

### 3.5 `field_action_participants` — N:N execução ↔ corretor

Quais corretores executaram aquela ação naquele dia. **Tabela
relacional** em vez de array JSONB porque a tela de pontuação precisa
contar participações por corretor por semana — vira `COUNT(*) GROUP BY`
com índice no broker.

| Coluna         | Tipo        | Notas                                            |
| -------------- | ----------- | ------------------------------------------------ |
| `execution_id` | UUID FK     | → `field_action_executions.id` ON DELETE CASCADE |
| `broker_id`    | UUID FK     | → `field_brokers.id` ON DELETE RESTRICT          |
| `created_at`   | TIMESTAMPTZ |                                                  |

PK composta `(execution_id, broker_id)`.

---

## 4. SQL completo

```sql
-- =============================================================
-- 4.1 Catálogo das ações de campo (estático)
-- =============================================================
CREATE TABLE field_actions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40)  NOT NULL UNIQUE,
  nome          VARCHAR(120) NOT NULL,
  descricao     TEXT         NOT NULL,
  resultado     VARCHAR(200) NOT NULL,
  custo         VARCHAR(60),
  detalhe       TEXT,
  icon_name     VARCHAR(40)  NOT NULL,
  accent        VARCHAR(10)  NOT NULL,
  display_order INT          NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX field_actions_active_order_idx
  ON field_actions (is_active, display_order);

-- =============================================================
-- 4.2 Cadastro do corretor (sem controle de semana)
-- =============================================================
CREATE TABLE field_brokers (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(64)  NOT NULL,
  nome         VARCHAR(120) NOT NULL,
  imobiliaria  VARCHAR(60)  NOT NULL DEFAULT '—',
  celular      VARCHAR(20),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT field_brokers_user_nome_uniq
    UNIQUE (user_id, nome)
);
CREATE INDEX field_brokers_user_active_idx
  ON field_brokers (user_id, is_active);

-- =============================================================
-- 4.3 Estatísticas semanais do corretor (controle por semana)
-- =============================================================
CREATE TABLE field_broker_weekly_stats (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64)  NOT NULL,
  broker_id     UUID         NOT NULL REFERENCES field_brokers(id) ON DELETE CASCADE,
  week_start    DATE         NOT NULL,
  ind           INT          NOT NULL DEFAULT 0,
  vis           INT          NOT NULL DEFAULT 0,
  pas           INT          NOT NULL DEFAULT 0,
  pas_aprov     INT          NOT NULL DEFAULT 0,
  vendas        INT          NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fbws_uniq UNIQUE (broker_id, week_start),
  CONSTRAINT fbws_week_is_monday
    CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  CONSTRAINT fbws_non_negative
    CHECK (ind >= 0 AND vis >= 0 AND pas >= 0
       AND pas_aprov >= 0 AND vendas >= 0)
);
CREATE INDEX fbws_user_week_idx
  ON field_broker_weekly_stats (user_id, week_start);

-- =============================================================
-- 4.4 Execução de uma ação em um dia da semana
-- =============================================================
CREATE TABLE field_action_executions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64)  NOT NULL,
  action_id     UUID         NOT NULL REFERENCES field_actions(id) ON DELETE RESTRICT,
  week_start    DATE         NOT NULL,
  weekday       SMALLINT     NOT NULL,
  local         VARCHAR(200),
  is_validated  BOOLEAN      NOT NULL DEFAULT FALSE,
  validated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fae_uniq
    UNIQUE (user_id, action_id, week_start, weekday),
  CONSTRAINT fae_week_is_monday
    CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  CONSTRAINT fae_weekday_range
    CHECK (weekday BETWEEN 1 AND 6)
);
CREATE INDEX fae_user_week_idx
  ON field_action_executions (user_id, week_start);
CREATE INDEX fae_action_week_idx
  ON field_action_executions (action_id, week_start);

-- =============================================================
-- 4.5 Participantes (corretores) de cada execução
-- =============================================================
CREATE TABLE field_action_participants (
  execution_id  UUID         NOT NULL REFERENCES field_action_executions(id) ON DELETE CASCADE,
  broker_id     UUID         NOT NULL REFERENCES field_brokers(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (execution_id, broker_id)
);
CREATE INDEX fap_broker_idx
  ON field_action_participants (broker_id);
```

---

## 5. Seed do catálogo (6 armas de campo)

Extraído de [arsenal-data.ts:93-167](<../src/app/(dashboard)/dashboard/_components/arsenal-data.ts#L93-L167>):

| `code`     | `nome`                | `icon_name`   | `accent`  | `custo`               |
| ---------- | --------------------- | ------------- | --------- | --------------------- |
| `panfleta` | Panfletagem           | `Megaphone`   | `emerald` | R$ 200 a R$ 400       |
| `portaria` | Portaria              | `Sword`       | `teal`    | R$ 150 a R$ 300       |
| `blitz`    | Blitz Digital         | `Smartphone`  | `violet`  | Budget mín R$ 500/sem |
| `evento`   | Evento Stand          | `Coffee`      | `amber`   | ≈ R$ 500              |
| `reativa`  | Mutirão de Reativação | `PhoneCall`   | `sky`     | R$ 0                  |
| `celebra`  | Celebração            | `PartyPopper` | `rose`    | ≈ R$ 15               |

---

## 6. Regras de negócio observadas na tela

### 6.1 Semana ISO

`week_start` é sempre **segunda-feira**. O front trabalha com 6 dias
úteis (Seg–Sáb — domingo não aparece em `DIAS_SEMANA`
[arsenal-data.ts:323](<../src/app/(dashboard)/dashboard/_components/arsenal-data.ts#L323>)).

### 6.2 Validar uma execução (botão "Validar")

Lógica em [arsenal-tab.tsx:218](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx#L218>):

1. Tem que existir **≥ 1 participante** em `field_action_participants`.
2. `local` é obrigatório (não nulo, não string vazia após trim).
3. Sucesso → `is_validated=true`, `validated_at=now()`.

> Validar **no servidor**, não confiar só no front.

### 6.3 Desfazer (botão "Desfazer")

Hoje a UI deleta o estado do dia ([arsenal-tab.tsx:232](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx#L232>)).
Duas opções:

- **Soft-undo (recomendado):** `is_validated=false`,
  `validated_at=null`, mantém local e participantes. Permite
  re-validar sem re-digitar.
- **Hard-undo:** `DELETE` da execução (cascata em `field_action_participants`).
  Espelha a UI atual mas perde dado.

### 6.4 Pontuação (cálculo no backend, nada persistido)

Constantes em [arsenal-data.ts:302-313](<../src/app/(dashboard)/dashboard/_components/arsenal-data.ts#L302-L313>):

| Origem do ponto                       | Pontos |
| ------------------------------------- | ------ |
| Cada ação de campo validada na semana | 5      |
| Bônus por ≥ 3 ações na semana         | +10    |
| Indicação                             | 3      |
| Visita                                | 5      |
| Pasta                                 | 10     |
| Pasta aprovada                        | 20     |
| Venda                                 | 30     |

Níveis: Soldado &lt;50 → Capitão ≥50 → General ≥100 → Lenda ≥150.

Como **`pts` e `nivel` são derivados**, não criar coluna para eles —
calcular na query/agregação. Se quiser mexer nos pesos sem deploy,
considerar uma tabela `field_scoring_config` com 1 linha.

### 6.5 Comportamentos de cascade

| Operação                                  | Comportamento                               |
| ----------------------------------------- | ------------------------------------------- |
| DELETE em `field_actions`                 | `RESTRICT` — bloqueado se existem execuções |
| Desativar arma (`is_active=false`)        | OK; UI filtra `is_active=true`              |
| DELETE hard em `field_brokers`            | `RESTRICT` em `field_action_participants`   |
| **Soft-delete em corretor** (recomendado) | `is_active=false`                           |
| DELETE em `field_action_executions`       | `CASCADE` em participants                   |
| DELETE em `field_broker_weekly_stats`     | independente, dropa só a semana             |

---

## 7. Validações no servidor

| Campo                                  | Regra                                                  |
| -------------------------------------- | ------------------------------------------------------ |
| `field_brokers.nome`                   | trim ≥ 1 char · único por `user_id` (case-insensitive) |
| `field_brokers.celular`                | opcional · ≤ 20 chars · texto livre                    |
| `field_broker_weekly_stats.*`          | inteiros ≥ 0                                           |
| `field_broker_weekly_stats.week_start` | `ISODOW=1`                                             |
| `field_action_executions.weekday`      | inteiro 1..6                                           |
| `field_action_executions.local`        | obrigatório (não nulo, não vazio) ao validar           |
| `field_action_participants`            | ≥ 1 participante quando `is_validated=true`            |

---

## 8. Considerações abertas

1. **Multi-tenant.** `user_id` (do JWT) escopa as queries. Se o
   produto for compartilhado entre stands/empreendimentos, talvez
   trocar por `tenant_id` em `field_brokers`, `field_action_executions`
   e `field_broker_weekly_stats`.
2. **Bônus de 3 ações.** Hoje calculado em memória no front
   ([arsenal-tab.tsx:90](<../src/app/(dashboard)/dashboard/_components/arsenal-tab.tsx#L90>)).
   No backend, vira uma CTE que conta `field_action_executions` validadas
   joinadas com `field_action_participants` agrupando por
   `broker_id` + `week_start`.
3. **Auditoria.** Se mais de uma pessoa puder validar pela mesma conta,
   considerar `validated_by` em `field_action_executions`.
4. **Treinamentos** (Corujão, Alvo, Duelo, Sino, Roleplay) ficam fora
   deste escopo. Se quiser unificar depois, é possível adicionar
   `tipo VARCHAR(15)` em `field_actions` e renomear o módulo, mas hoje
   não há nada a fazer aqui.

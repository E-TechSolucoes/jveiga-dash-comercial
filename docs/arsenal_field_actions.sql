-- =============================================================================
-- Arsenal · Ações de Campo
-- Versão: 2026-04-26 (v1)
-- Spec:   docs-apis/arsenal-field-actions-schema.md
-- =============================================================================
-- Modelagem da sub-aba "Ações de Campo" (aba Armas do dashboard comercial).
-- 5 tabelas:
--   field_actions               — catálogo das 6 armas de campo (estático)
--   field_brokers               — cadastro global do corretor (sem semana)
--   field_broker_weekly_stats   — estatísticas do corretor por semana ISO
--   field_action_executions     — execução de uma arma em um dia da semana
--   field_action_participants   — N:N execução ↔ corretor
--
-- Idempotente. Pode rodar direto no banco ou via Bun migrator.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1) Catálogo das ações de campo (estático)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_actions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40)  NOT NULL UNIQUE,
  nome          VARCHAR(120) NOT NULL,
  descricao     TEXT         NOT NULL,
  resultado     VARCHAR(200) NOT NULL,
  custo         VARCHAR(60),
  detalhe       TEXT,
  icon_name     VARCHAR(40)  NOT NULL,
  accent        VARCHAR(10)  NOT NULL,
  type          VARCHAR(20)  NOT NULL DEFAULT 'field_action',
  display_order INT          NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Para rodar em base já existente sem o type:
ALTER TABLE field_actions
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'field_action';

CREATE INDEX IF NOT EXISTS field_actions_active_order_idx
  ON field_actions (is_active, display_order);

CREATE INDEX IF NOT EXISTS field_actions_type_active_order_idx
  ON field_actions (type, is_active, display_order);

-- -----------------------------------------------------------------------------
-- 2) Cadastro global do corretor (sem controle de semana)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_brokers (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(64)  NOT NULL,
  nome         VARCHAR(120) NOT NULL,
  imobiliaria  VARCHAR(60)  NOT NULL DEFAULT '—',
  celular      VARCHAR(20),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT field_brokers_user_nome_uniq UNIQUE (user_id, nome)
);

CREATE INDEX IF NOT EXISTS field_brokers_user_active_idx
  ON field_brokers (user_id, is_active);

-- -----------------------------------------------------------------------------
-- 3) Estatísticas semanais do corretor (controle por semana ISO)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_broker_weekly_stats (
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

CREATE INDEX IF NOT EXISTS fbws_user_week_idx
  ON field_broker_weekly_stats (user_id, week_start);

-- -----------------------------------------------------------------------------
-- 4) Execução de uma ação em um dia da semana
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_action_executions (
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
  CONSTRAINT fae_uniq UNIQUE (user_id, action_id, week_start, weekday),
  CONSTRAINT fae_week_is_monday
    CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  CONSTRAINT fae_weekday_range
    CHECK (weekday BETWEEN 1 AND 6)
);

CREATE INDEX IF NOT EXISTS fae_user_week_idx
  ON field_action_executions (user_id, week_start);
CREATE INDEX IF NOT EXISTS fae_action_week_idx
  ON field_action_executions (action_id, week_start);

-- -----------------------------------------------------------------------------
-- 5) Participantes (corretores) de cada execução
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_action_participants (
  execution_id  UUID         NOT NULL REFERENCES field_action_executions(id) ON DELETE CASCADE,
  broker_id     UUID         NOT NULL REFERENCES field_brokers(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (execution_id, broker_id)
);

CREATE INDEX IF NOT EXISTS fap_broker_idx
  ON field_action_participants (broker_id);

-- -----------------------------------------------------------------------------
-- Seed do catálogo (6 armas de campo)
-- Idempotente: ON CONFLICT atualiza nome/icon/accent/order/custo se mudaram.
-- -----------------------------------------------------------------------------
INSERT INTO field_actions
  (code, nome, descricao, resultado, custo, detalhe, icon_name, accent, type, display_order)
VALUES
  ('panfleta', 'Panfletagem',
   'Panfletagem em pontos de fluxo (semáforos, lojas, mercados).',
   'Indicações qualificadas no ponto de fluxo',
   'R$ 200 a R$ 400',
   'Distribuição em horários de pico, foco em pessoas que moram ou trabalham na região.',
   'Megaphone', 'emerald', 'field_action', 10),

  ('portaria', 'Portaria',
   'Abordagem em portarias de prédios e condomínios da região.',
   'Visitas agendadas com moradores próximos',
   'R$ 150 a R$ 300',
   'Negociar autorização com sindico/portaria, abordar moradores no horário de pico.',
   'Sword', 'teal', 'field_action', 20),

  ('blitz', 'Blitz Digital',
   'Campanha paga em redes sociais com segmentação geográfica.',
   'Leads digitais segmentados por raio',
   'Budget mín R$ 500/sem',
   'Anúncios geolocalizados (Meta/Google), criativos com CTA pra agendar visita.',
   'Smartphone', 'violet', 'field_action', 30),

  ('evento', 'Evento Stand',
   'Evento temático no stand (café, bolo, sorteio) pra atrair fluxo.',
   'Visitas espontâneas no stand',
   '≈ R$ 500',
   'Divulgar 1 semana antes, cardápio simples, entregar brinde + ficha de visita.',
   'Coffee', 'amber', 'field_action', 40),

  ('reativa', 'Mutirão de Reativação',
   'Ligação ativa em base fria pra reagendar visita.',
   'Visitas reagendadas de leads esquecidos',
   'R$ 0',
   'Toda a equipe ligando 2h, lista filtrada por leads sem contato há 30+ dias.',
   'PhoneCall', 'sky', 'field_action', 50),

  ('celebra', 'Celebração',
   'Celebração da venda no stand (sino + confetes + fotos).',
   'Engajamento social + prova social',
   '≈ R$ 15',
   'Acionar ao fechar venda, foto com o cliente, stories pra criar tração.',
   'PartyPopper', 'rose', 'field_action', 60),

  -- ---------------------------------------------------------------
  -- Treinamentos (sub-aba "Treinamentos"). Sem custo por padrão.
  -- ---------------------------------------------------------------
  ('corujao', 'Corujão',
   'Estudo aprofundado em horário diferenciado.',
   'Conhecimento técnico e regulatório',
   NULL,
   'Sessão noturna/madrugada de mergulho em produto, regulamentação e cases.',
   'GraduationCap', 'indigo', 'training', 70),

  ('alvo', 'Alvo do Dia',
   'Foco diário em uma meta-treino específica.',
   'Metas batidas com foco direcionado',
   NULL,
   'Definição da meta micro do dia para concentrar esforço.',
   'Target', 'cyan', 'training', 80),

  ('duelo', 'Duelos',
   'Confronto 1v1 entre corretores em simulações.',
   'Repertório de objeções treinado',
   NULL,
   'Pares disputam quem fecha melhor o pitch ou contorna a objeção.',
   'Swords', 'fuchsia', 'training', 90),

  ('sino', 'Sino',
   'Toque do sino para celebrar conquista do treino.',
   'Reforço positivo e prova social',
   NULL,
   'Cada conquista de treino acionada com sino para criar tração.',
   'Bell', 'purple', 'training', 100),

  ('role', 'Roleplay Objeções',
   'Encenação de objeções reais com par avaliador.',
   'Respostas ensaiadas para objeções comuns',
   NULL,
   'Pares simulam cliente x corretor; o avaliador pontua a resposta.',
   'Theater', 'slate', 'training', 110)
ON CONFLICT (code) DO UPDATE
  SET nome          = EXCLUDED.nome,
      descricao     = EXCLUDED.descricao,
      resultado     = EXCLUDED.resultado,
      custo         = EXCLUDED.custo,
      detalhe       = EXCLUDED.detalhe,
      icon_name     = EXCLUDED.icon_name,
      accent        = EXCLUDED.accent,
      type          = EXCLUDED.type,
      display_order = EXCLUDED.display_order,
      updated_at    = NOW();

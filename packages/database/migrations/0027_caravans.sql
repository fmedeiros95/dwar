-- Partilha da Caravana: uma carga, duas aldeias. Uma divide em duas carroças, a outra escolhe.
-- A participação é da aldeia: quem a possui no momento age por ela e recebe a carroça dela.
CREATE TABLE caravans (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL REFERENCES worlds (id),
  x integer NOT NULL,
  y integer NOT NULL,
  divider_village_id integer NOT NULL,
  chooser_village_id integer NOT NULL,
  -- Donos na chegada, para o histórico e para alternar os papéis.
  divider_player_id integer NOT NULL,
  chooser_player_id integer NOT NULL,
  cargo jsonb NOT NULL,
  -- Flâmula de quem vai escolher: o que diz querer (pode blefar).
  banner text CHECK (banner IN ('wood', 'stone', 'iron')),
  -- Parte da carroça do Sol antes do pedágio; nula enquanto ninguém dividiu.
  sun jsonb,
  -- Carroça que ficou com quem escolhe; nula até a escolha.
  chosen text CHECK (chosen IN ('sun', 'moon')),
  divided_by_absence boolean NOT NULL DEFAULT false,
  chosen_by_absence boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  divide_by timestamptz NOT NULL,
  choose_by timestamptz,
  resolved_at timestamptz,
  FOREIGN KEY (divider_village_id, world_id) REFERENCES villages (id, world_id),
  FOREIGN KEY (chooser_village_id, world_id) REFERENCES villages (id, world_id),
  FOREIGN KEY (divider_player_id, world_id) REFERENCES players (id, world_id),
  FOREIGN KEY (chooser_player_id, world_id) REFERENCES players (id, world_id),
  CONSTRAINT caravans_two_villages CHECK (divider_village_id <> chooser_village_id),
  CONSTRAINT caravans_order CHECK (
    (sun IS NULL AND chosen IS NULL AND resolved_at IS NULL)
    OR (sun IS NOT NULL AND choose_by IS NOT NULL AND (chosen IS NULL) = (resolved_at IS NULL))
  )
);
CREATE INDEX caravans_open_idx ON caravans (world_id) WHERE resolved_at IS NULL;
CREATE INDEX caravans_divider_idx ON caravans (divider_player_id, world_id);
CREATE INDEX caravans_chooser_idx ON caravans (chooser_player_id, world_id);

-- Carroça parada no portão até ser descarregada; `left` diminui, nunca aumenta.
CREATE TABLE caravan_carts (
  caravan_id integer NOT NULL REFERENCES caravans (id),
  world_id integer NOT NULL,
  village_id integer NOT NULL,
  lot text NOT NULL CHECK (lot IN ('sun', 'moon')),
  load jsonb NOT NULL,
  "left" jsonb NOT NULL,
  emptied_at timestamptz,
  PRIMARY KEY (caravan_id, lot),
  FOREIGN KEY (village_id, world_id) REFERENCES villages (id, world_id)
);
CREATE INDEX caravan_carts_waiting_idx ON caravan_carts (village_id) WHERE emptied_at IS NULL;

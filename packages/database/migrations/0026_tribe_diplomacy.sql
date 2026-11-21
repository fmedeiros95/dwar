-- Diplomacia entre tribos (como no Speed Wars): cada tribo declara por conta própria uma relação
-- (aliada, pacto de não agressão ou inimiga) com outra, e as guerras são formais, com título,
-- declaração, pedido de paz e arquivo.
CREATE TABLE tribe_relations (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL,
  from_tribe_id integer NOT NULL,
  to_tribe_id integer NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tribe_relations_kind_check CHECK (kind IN ('ally', 'nap', 'enemy')),
  CONSTRAINT tribe_relations_distinct_check CHECK (from_tribe_id <> to_tribe_id),
  FOREIGN KEY (from_tribe_id, world_id) REFERENCES tribes (id, world_id) ON DELETE CASCADE,
  FOREIGN KEY (to_tribe_id, world_id) REFERENCES tribes (id, world_id) ON DELETE CASCADE,
  UNIQUE (from_tribe_id, to_tribe_id)
);
CREATE INDEX tribe_relations_to_idx ON tribe_relations (to_tribe_id);

CREATE TABLE tribe_wars (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL,
  declarer_tribe_id integer NOT NULL,
  target_tribe_id integer NOT NULL,
  title text NOT NULL,
  -- Declaração da guerra (BBCode).
  body text NOT NULL DEFAULT '',
  declared_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CONSTRAINT tribe_wars_title_check CHECK (char_length(title) BETWEEN 1 AND 32),
  CONSTRAINT tribe_wars_body_check CHECK (char_length(body) <= 10000),
  CONSTRAINT tribe_wars_distinct_check CHECK (declarer_tribe_id <> target_tribe_id),
  FOREIGN KEY (declarer_tribe_id, world_id) REFERENCES tribes (id, world_id) ON DELETE CASCADE,
  FOREIGN KEY (target_tribe_id, world_id) REFERENCES tribes (id, world_id) ON DELETE CASCADE
);
-- No máximo uma guerra em andamento entre duas tribos, qualquer que seja quem declarou.
CREATE UNIQUE INDEX tribe_wars_active_pair_idx
  ON tribe_wars (world_id, least(declarer_tribe_id, target_tribe_id), greatest(declarer_tribe_id, target_tribe_id))
  WHERE ended_at IS NULL;
CREATE INDEX tribe_wars_declarer_idx ON tribe_wars (declarer_tribe_id);
CREATE INDEX tribe_wars_target_idx ON tribe_wars (target_tribe_id);

CREATE TABLE tribe_peace_offers (
  war_id integer PRIMARY KEY REFERENCES tribe_wars (id) ON DELETE CASCADE,
  offered_by_tribe_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

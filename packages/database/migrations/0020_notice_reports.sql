-- Relatórios que não são batalha (comércio e chegada de apoio). Um registro por destinatário, então
-- cada jogador lê, marca e apaga o seu sem afetar o do outro lado.
CREATE TABLE notice_reports (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL REFERENCES worlds (id),
  player_id integer NOT NULL,
  kind text NOT NULL,
  occurred_at timestamptz NOT NULL,
  from_village_id integer NOT NULL,
  to_village_id integer NOT NULL,
  payload jsonb NOT NULL,
  read_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT notice_reports_kind_check CHECK (kind IN ('trade', 'support')),
  FOREIGN KEY (player_id, world_id) REFERENCES players (id, world_id),
  FOREIGN KEY (from_village_id, world_id) REFERENCES villages (id, world_id),
  FOREIGN KEY (to_village_id, world_id) REFERENCES villages (id, world_id)
);
CREATE INDEX notice_reports_visible_idx
  ON notice_reports (player_id, world_id, occurred_at DESC, id DESC)
  WHERE deleted_at IS NULL;

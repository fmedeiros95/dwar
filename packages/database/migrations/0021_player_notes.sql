-- Notas pessoais com BBCode: uma geral por jogador e, opcionalmente, uma por aldeia (própria ou de
-- outro jogador, para anotar alvos). Só o dono lê e escreve; texto vazio apaga a nota.
CREATE TABLE player_notes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL REFERENCES worlds (id),
  player_id integer NOT NULL,
  village_id integer,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_notes_body_check CHECK (char_length(body) BETWEEN 1 AND 10000),
  FOREIGN KEY (player_id, world_id) REFERENCES players (id, world_id),
  FOREIGN KEY (village_id, world_id) REFERENCES villages (id, world_id)
);
CREATE UNIQUE INDEX player_notes_general_idx ON player_notes (player_id) WHERE village_id IS NULL;
CREATE UNIQUE INDEX player_notes_village_idx ON player_notes (player_id, village_id)
  WHERE village_id IS NOT NULL;

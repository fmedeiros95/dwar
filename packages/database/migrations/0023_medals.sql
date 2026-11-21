-- Medalhas: guarda o último nível de cada medalha de cada jogador, para avisar só quando sobe. Os
-- valores que definem o nível são calculados a partir dos relatórios e das tabelas do jogo.
CREATE TABLE player_medals (
  player_id integer NOT NULL,
  world_id integer NOT NULL,
  code text NOT NULL,
  stage integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, code),
  CONSTRAINT player_medals_stage_check CHECK (stage BETWEEN 0 AND 4),
  FOREIGN KEY (player_id, world_id) REFERENCES players (id, world_id)
);

-- O aviso de medalha nova aparece na lista de relatórios e não envolve aldeias.
ALTER TABLE notice_reports
  ALTER COLUMN from_village_id DROP NOT NULL,
  ALTER COLUMN to_village_id DROP NOT NULL;
ALTER TABLE notice_reports DROP CONSTRAINT notice_reports_kind_check;
ALTER TABLE notice_reports
  ADD CONSTRAINT notice_reports_kind_check CHECK (kind IN ('trade', 'support', 'medal'));

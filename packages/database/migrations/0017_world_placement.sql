-- Posicionamento de aldeias em espiral por quadrante (modelo Speed Wars) e quantas aldeias
-- bárbaras criar a cada jogador novo (configuração por mundo).
ALTER TABLE worlds ADD COLUMN barbarian_villages_per_player integer NOT NULL DEFAULT 1;
ALTER TABLE worlds ADD CONSTRAINT worlds_barbarians_per_player_check
  CHECK (barbarian_villages_per_player BETWEEN 0 AND 20);

-- Estado do posicionamento: por mundo, por fluxo (jogadores ou bárbaras) e por quadrante.
-- count: aldeias já criadas; ring: raio-base do anel atual; alpha: ângulo (graus) do último ponto.
CREATE TABLE world_placement (
  world_id integer NOT NULL REFERENCES worlds (id) ON DELETE CASCADE,
  stream text NOT NULL CHECK (stream IN ('player', 'barbarian')),
  quadrant text NOT NULL CHECK (quadrant IN ('nw', 'ne', 'se', 'sw')),
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  ring integer NOT NULL DEFAULT 1 CHECK (ring >= 1),
  alpha integer NOT NULL DEFAULT 0 CHECK (alpha >= 0 AND alpha < 90),
  PRIMARY KEY (world_id, stream, quadrant)
);

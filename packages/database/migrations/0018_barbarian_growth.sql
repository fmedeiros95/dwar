-- Evolução automática das aldeias bárbaras: o mundo define a pontuação-limite (0 desliga) e cada
-- aldeia sem dono guarda quando sobe o próximo nível de construção.
ALTER TABLE worlds ADD COLUMN barbarian_max_points integer NOT NULL DEFAULT 0;
ALTER TABLE worlds ADD CONSTRAINT worlds_barbarian_max_points_check CHECK (barbarian_max_points >= 0);

ALTER TABLE villages ADD COLUMN growth_at timestamptz;
CREATE INDEX villages_growth_idx ON villages (world_id, growth_at) WHERE growth_at IS NOT NULL;

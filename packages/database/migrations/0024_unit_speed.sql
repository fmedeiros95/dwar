-- Velocidade das tropas, separada da velocidade do mundo (como o movement_speed do Speed Wars):
-- só altera o tempo de viagem das tropas. Em milésimos, como as outras velocidades; 1000 = normal.
ALTER TABLE worlds ADD COLUMN unit_speed integer NOT NULL DEFAULT 1000;
ALTER TABLE worlds ADD CONSTRAINT worlds_unit_speed_check CHECK (unit_speed > 0);

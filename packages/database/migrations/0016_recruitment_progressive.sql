-- Recrutamento progressivo: as tropas de um lote saem uma a uma, conforme o tempo de cada
-- unidade, em vez de todas de uma vez ao fim do lote. delivered_quantity guarda quantas já saíram.
ALTER TABLE recruitment_events ADD COLUMN delivered_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE recruitment_events ADD CONSTRAINT recruitment_delivered_check
  CHECK (delivered_quantity >= 0 AND delivered_quantity <= quantity);

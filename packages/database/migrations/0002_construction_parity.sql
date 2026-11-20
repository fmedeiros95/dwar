ALTER TABLE accounts ADD COLUMN graphical_overview boolean NOT NULL DEFAULT true;
ALTER TABLE construction_events ADD COLUMN cancelled_at timestamptz;
ALTER TABLE construction_events ADD CONSTRAINT construction_one_terminal_state
  CHECK (completed_at IS NULL OR cancelled_at IS NULL);
DROP INDEX construction_pending_idx;
CREATE INDEX construction_pending_idx ON construction_events(world_id, ends_at, id)
  WHERE completed_at IS NULL AND cancelled_at IS NULL;

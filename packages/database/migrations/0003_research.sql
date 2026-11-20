CREATE TABLE research_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL, village_id uuid NOT NULL,
  technology_code text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  completed_at timestamptz, cost jsonb NOT NULL, request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_village_technology_idx UNIQUE(village_id, technology_code),
  CONSTRAINT research_request_idx UNIQUE(village_id, request_id),
  FOREIGN KEY(village_id, world_id) REFERENCES villages(id, world_id),
  CONSTRAINT research_valid_schedule CHECK (ends_at > starts_at),
  CONSTRAINT research_valid_technology CHECK (technology_code IN ('sword','axe','archer','spy','light','heavy','ram','catapult'))
);
CREATE INDEX research_pending_idx ON research_events(world_id, ends_at, id) WHERE completed_at IS NULL;

CREATE TABLE recruitment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL, village_id uuid NOT NULL,
  building_code text NOT NULL, unit_code text NOT NULL, quantity integer NOT NULL,
  unit_seconds integer NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  completed_at timestamptz, cancelled_at timestamptz, cost jsonb NOT NULL, population integer NOT NULL,
  request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_request_unit_idx UNIQUE(village_id, request_id, unit_code),
  FOREIGN KEY(village_id, world_id) REFERENCES villages(id, world_id),
  CONSTRAINT recruitment_valid_quantity CHECK (quantity BETWEEN 1 AND 99999 AND unit_seconds >= 1 AND population > 0),
  CONSTRAINT recruitment_valid_schedule CHECK (ends_at = starts_at + quantity * unit_seconds * interval '1 second'),
  CONSTRAINT recruitment_one_terminal_state CHECK (completed_at IS NULL OR cancelled_at IS NULL),
  CONSTRAINT recruitment_valid_unit CHECK (
    (building_code='barracks' AND unit_code IN ('spear','sword','axe','archer')) OR
    (building_code='stable' AND unit_code IN ('spy','light','heavy')) OR
    (building_code='workshop' AND unit_code IN ('ram','catapult'))
  )
);
CREATE INDEX recruitment_pending_idx ON recruitment_events(world_id, ends_at, id) WHERE completed_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX recruitment_queue_idx ON recruitment_events(village_id, building_code, starts_at, id) WHERE completed_at IS NULL AND cancelled_at IS NULL;
CREATE TABLE unit_placements (
  world_id uuid NOT NULL, origin_village_id uuid NOT NULL, location_village_id uuid NOT NULL,
  unit_code text NOT NULL, quantity integer NOT NULL,
  PRIMARY KEY(origin_village_id, location_village_id, unit_code),
  FOREIGN KEY(origin_village_id, world_id) REFERENCES villages(id, world_id),
  FOREIGN KEY(location_village_id, world_id) REFERENCES villages(id, world_id),
  CONSTRAINT placements_nonnegative_quantity CHECK (quantity >= 0),
  CONSTRAINT placements_valid_unit CHECK (unit_code IN ('spear','sword','axe','archer','spy','light','heavy','ram','catapult'))
);
CREATE INDEX placements_location_idx ON unit_placements(location_village_id, world_id);

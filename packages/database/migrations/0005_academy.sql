ALTER TABLE recruitment_events DROP CONSTRAINT recruitment_valid_unit;
ALTER TABLE recruitment_events ADD CONSTRAINT recruitment_valid_unit CHECK (
  (building_code='barracks' AND unit_code IN ('spear','sword','axe','archer')) OR
  (building_code='stable' AND unit_code IN ('spy','light','heavy')) OR
  (building_code='workshop' AND unit_code IN ('ram','catapult')) OR
  (building_code='noble' AND unit_code='noble' AND quantity=1 AND population=100)
);
ALTER TABLE unit_placements DROP CONSTRAINT placements_valid_unit;
ALTER TABLE unit_placements ADD CONSTRAINT placements_valid_unit CHECK (unit_code IN ('spear','sword','axe','archer','spy','light','heavy','ram','catapult','noble'));
CREATE TABLE coin_mint_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL, player_id uuid NOT NULL,
  village_id uuid NOT NULL, request_id uuid NOT NULL, cost jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coin_mint_request_idx UNIQUE(player_id, request_id),
  FOREIGN KEY(player_id, world_id) REFERENCES players(id, world_id),
  FOREIGN KEY(village_id, world_id) REFERENCES villages(id, world_id)
);
CREATE INDEX coin_mint_village_idx ON coin_mint_events(village_id, world_id);

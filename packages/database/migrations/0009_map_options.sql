CREATE TABLE map_preferences (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  settings jsonb NOT NULL
);
CREATE TABLE map_marks (
  world_id uuid NOT NULL REFERENCES worlds(id),
  player_id uuid NOT NULL,
  target_player_id uuid NOT NULL,
  color text NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  PRIMARY KEY (player_id, target_player_id),
  FOREIGN KEY (player_id, world_id) REFERENCES players(id, world_id) ON DELETE CASCADE,
  FOREIGN KEY (target_player_id, world_id) REFERENCES players(id, world_id) ON DELETE CASCADE,
  CHECK (player_id <> target_player_id)
);

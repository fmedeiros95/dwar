CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL,
  email text NOT NULL UNIQUE, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX accounts_username_ci ON accounts (lower(username));
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE worlds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
  rules_version text NOT NULL, build_speed integer NOT NULL, production_speed integer NOT NULL,
  max_build_queue integer NOT NULL,
  CONSTRAINT world_positive_settings CHECK (build_speed > 0 AND production_speed > 0 AND max_build_queue > 0)
);
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL REFERENCES worlds(id),
  account_id uuid NOT NULL REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, world_id), UNIQUE(id, world_id)
);
CREATE TABLE villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL REFERENCES worlds(id),
  player_id uuid NOT NULL, name text NOT NULL, x integer NOT NULL, y integer NOT NULL,
  wood double precision NOT NULL, stone double precision NOT NULL, iron double precision NOT NULL,
  population_used integer NOT NULL, points integer NOT NULL, buildings jsonb NOT NULL, updated_at timestamptz NOT NULL,
  UNIQUE(world_id, x, y), UNIQUE(id, world_id),
  FOREIGN KEY(player_id, world_id) REFERENCES players(id, world_id),
  CONSTRAINT villages_nonnegative_state CHECK (wood >= 0 AND stone >= 0 AND iron >= 0 AND population_used >= 0 AND points >= 0)
);
CREATE INDEX villages_owner_idx ON villages(player_id, world_id);
CREATE TABLE construction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL, village_id uuid NOT NULL,
  building_code text NOT NULL, target_level integer NOT NULL, starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL, completed_at timestamptz, cost jsonb NOT NULL, population integer NOT NULL,
  request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(village_id, request_id), FOREIGN KEY(village_id, world_id) REFERENCES villages(id, world_id),
  CONSTRAINT construction_valid_schedule CHECK (ends_at >= starts_at AND target_level > 0)
);
CREATE INDEX construction_pending_idx ON construction_events(world_id, ends_at, id) WHERE completed_at IS NULL;
CREATE TABLE activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL, village_id uuid NOT NULL,
  message text NOT NULL, occurred_at timestamptz NOT NULL,
  FOREIGN KEY(village_id, world_id) REFERENCES villages(id, world_id)
);
CREATE INDEX activity_village_time_idx ON activity(village_id, occurred_at);

ALTER TABLE villages ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE villages ADD COLUMN founded_as_barbarian boolean NOT NULL DEFAULT false;

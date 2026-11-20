CREATE TABLE troop_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL,
  village_id uuid NOT NULL,
  request_id uuid NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (village_id, world_id) REFERENCES villages(id, world_id),
  UNIQUE (village_id, request_id)
);
CREATE TABLE troop_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL,
  origin_village_id uuid NOT NULL,
  from_village_id uuid NOT NULL,
  to_village_id uuid NOT NULL,
  kind text NOT NULL,
  troops jsonb NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  arrived_at timestamptz,
  FOREIGN KEY (origin_village_id, world_id) REFERENCES villages(id, world_id),
  FOREIGN KEY (from_village_id, world_id) REFERENCES villages(id, world_id),
  FOREIGN KEY (to_village_id, world_id) REFERENCES villages(id, world_id),
  CONSTRAINT troop_movement_route CHECK (
    from_village_id <> to_village_id AND ends_at > starts_at AND
    ((kind='support' AND origin_village_id=from_village_id) OR (kind='return' AND origin_village_id=to_village_id))
  )
);
CREATE INDEX troop_movements_pending_idx ON troop_movements(world_id, ends_at, id) WHERE arrived_at IS NULL;
CREATE INDEX troop_movements_origin_idx ON troop_movements(origin_village_id, world_id);

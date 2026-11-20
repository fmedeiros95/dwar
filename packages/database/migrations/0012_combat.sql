ALTER TABLE players ADD COLUMN protection_until timestamptz NOT NULL DEFAULT (now() + interval '25 minutes');
ALTER TABLE players ADD COLUMN last_conquered_at timestamptz;
UPDATE players SET protection_until=created_at+interval '25 minutes';
ALTER TABLE villages ADD COLUMN loyalty double precision NOT NULL DEFAULT 100 CHECK(loyalty BETWEEN 0 AND 100);
ALTER TABLE villages ADD COLUMN loyalty_updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE troop_movements ADD COLUMN owner_player_id integer;
UPDATE troop_movements m SET owner_player_id=v.player_id FROM villages v WHERE v.id=m.origin_village_id;
ALTER TABLE troop_movements ALTER COLUMN owner_player_id SET NOT NULL;
ALTER TABLE troop_movements ADD CONSTRAINT movement_owner_world FOREIGN KEY(owner_player_id,world_id) REFERENCES players(id,world_id);
ALTER TABLE troop_movements ADD COLUMN origin_lost boolean NOT NULL DEFAULT false;
ALTER TABLE troop_movements ADD COLUMN loot jsonb NOT NULL DEFAULT '{"wood":0,"stone":0,"iron":0}';
ALTER TABLE troop_movements ADD COLUMN target_building text;
ALTER TABLE troop_movements DROP CONSTRAINT troop_movement_route;
ALTER TABLE troop_movements ADD CONSTRAINT troop_movement_route CHECK(from_village_id<>to_village_id AND ends_at>starts_at AND (((kind='support' OR kind='attack') AND origin_village_id=from_village_id) OR (kind='return' AND origin_village_id=to_village_id)));
CREATE TABLE battle_reports (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, world_id integer NOT NULL REFERENCES worlds(id),
 movement_id integer NOT NULL UNIQUE REFERENCES troop_movements(id), from_village_id integer NOT NULL, to_village_id integer NOT NULL,
 occurred_at timestamptz NOT NULL, result jsonb NOT NULL, UNIQUE(id,world_id),
 FOREIGN KEY(from_village_id,world_id) REFERENCES villages(id,world_id),
 FOREIGN KEY(to_village_id,world_id) REFERENCES villages(id,world_id)
);
CREATE TABLE battle_report_recipients (
 world_id integer NOT NULL, report_id integer NOT NULL, player_id integer NOT NULL,
 role text NOT NULL CHECK(role IN('attacker','defender','support')),
 support_troops jsonb, support_losses jsonb, read_at timestamptz,
 PRIMARY KEY(report_id,player_id),
 FOREIGN KEY(report_id,world_id) REFERENCES battle_reports(id,world_id),
 FOREIGN KEY(player_id,world_id) REFERENCES players(id,world_id)
);
CREATE INDEX battle_reports_world_time_idx ON battle_reports(world_id,occurred_at DESC,id DESC);
CREATE INDEX battle_report_recipients_player_idx ON battle_report_recipients(player_id,world_id);

-- Both the API and the worker write these tables. PostgreSQL delivers notifications
-- only after commit and folds identical notifications in the same transaction.
CREATE FUNCTION dwar_notify_world_change(change_scope text, world integer, player integer DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
  SELECT pg_notify('dwar_world_changes', jsonb_strip_nulls(jsonb_build_object(
    'scope', change_scope, 'worldId', world, 'playerId', player
  ))::text);
$$;

CREATE FUNCTION dwar_notify_village_owners(world integer, VARIADIC village_ids integer[])
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM dwar_notify_world_change('village', world, owner.player_id)
  FROM (
    SELECT DISTINCT player_id FROM villages
    WHERE world_id = world AND id = ANY(village_ids) AND player_id IS NOT NULL
  ) AS owner;
END;
$$;

CREATE FUNCTION dwar_notify_village_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    IF COALESCE(NEW.player_id, OLD.player_id) IS NOT NULL THEN
      PERFORM dwar_notify_world_change('village', COALESCE(NEW.world_id, OLD.world_id),
        COALESCE(NEW.player_id, OLD.player_id));
    END IF;
    RETURN NULL;
  END IF;

  -- Ownership drives both the village snapshot and the list of incoming commands.
  IF (OLD.world_id, OLD.player_id) IS DISTINCT FROM (NEW.world_id, NEW.player_id) THEN
    IF OLD.player_id IS NOT NULL THEN
      PERFORM dwar_notify_world_change('village', OLD.world_id, OLD.player_id);
      PERFORM dwar_notify_world_change('incomings', OLD.world_id, OLD.player_id);
    END IF;
    IF NEW.player_id IS NOT NULL THEN
      PERFORM dwar_notify_world_change('village', NEW.world_id, NEW.player_id);
      PERFORM dwar_notify_world_change('incomings', NEW.world_id, NEW.player_id);
    END IF;
  ELSIF NEW.player_id IS NOT NULL AND (
    (OLD.name, OLD.x, OLD.y, OLD.buildings, OLD.points, OLD.population_used, OLD.loyalty, OLD.loyalty_updated_at)
      IS DISTINCT FROM
    (NEW.name, NEW.x, NEW.y, NEW.buildings, NEW.points, NEW.population_used, NEW.loyalty, NEW.loyalty_updated_at)
    OR (OLD.updated_at = NEW.updated_at AND
      (OLD.wood, OLD.stone, OLD.iron) IS DISTINCT FROM (NEW.wood, NEW.stone, NEW.iron))
  ) THEN
    -- Reads also settle continuous production (resources and updated_at together).
    -- Only discrete resource writes and changes to snapshot fields should wake clients.
    PERFORM dwar_notify_world_change('village', NEW.world_id, NEW.player_id);
  END IF;

  IF (OLD.name, OLD.x, OLD.y) IS DISTINCT FROM (NEW.name, NEW.x, NEW.y) THEN
    IF NEW.player_id IS NOT NULL THEN
      PERFORM dwar_notify_world_change('incomings', NEW.world_id, NEW.player_id);
    END IF;
    -- An incoming command displays the sending village's name and coordinates.
    PERFORM dwar_notify_world_change('incomings', NEW.world_id, target.player_id)
    FROM (
      SELECT DISTINCT v.player_id
      FROM troop_movements m JOIN villages v ON (v.id, v.world_id) = (m.to_village_id, m.world_id)
      WHERE m.origin_village_id = NEW.id AND m.world_id = NEW.world_id AND m.arrived_at IS NULL
        AND m.kind IN ('attack', 'support') AND v.player_id <> m.owner_player_id
    ) AS target;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_village_change AFTER INSERT OR UPDATE OR DELETE ON villages
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_village_change();

CREATE FUNCTION dwar_notify_village_child() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW IS DISTINCT FROM OLD THEN
    PERFORM dwar_notify_village_owners(COALESCE(NEW.world_id, OLD.world_id),
      COALESCE(NEW.village_id, OLD.village_id));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_construction_change AFTER INSERT OR UPDATE OR DELETE ON construction_events
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_village_child();
CREATE TRIGGER notify_research_change AFTER INSERT OR UPDATE OR DELETE ON research_events
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_village_child();
CREATE TRIGGER notify_recruitment_change AFTER INSERT OR UPDATE OR DELETE ON recruitment_events
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_village_child();
CREATE TRIGGER notify_activity_change AFTER INSERT OR UPDATE OR DELETE ON activity
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_village_child();

CREATE FUNCTION dwar_notify_placement_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW IS DISTINCT FROM OLD THEN
    PERFORM dwar_notify_village_owners(COALESCE(NEW.world_id, OLD.world_id),
      COALESCE(NEW.origin_village_id, OLD.origin_village_id),
      COALESCE(NEW.location_village_id, OLD.location_village_id));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_placement_change AFTER INSERT OR UPDATE OR DELETE ON unit_placements
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_placement_change();

CREATE FUNCTION dwar_notify_movement_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  movement troop_movements;
BEGIN
  IF TG_OP = 'INSERT' THEN
    movement := NEW;
  ELSE
    movement := OLD;
  END IF;

  -- The game creates commands pending and marks them arrived or canceled in place.
  IF movement.arrived_at IS NOT NULL OR
    (TG_OP = 'UPDATE' AND NEW.arrived_at IS NULL) THEN
    RETURN NULL;
  END IF;

  IF movement.kind IN ('attack', 'support') THEN
    PERFORM dwar_notify_world_change('incomings', movement.world_id, player_id)
    FROM villages WHERE world_id = movement.world_id AND id = movement.to_village_id
      AND player_id <> movement.owner_player_id;
  END IF;
  -- Nobles in transit also affect the academy's coin requirements.
  IF (movement.troops->>'noble')::integer > 0 THEN
    PERFORM dwar_notify_village_owners(movement.world_id, movement.origin_village_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_movement_change AFTER INSERT OR UPDATE OF arrived_at OR DELETE ON troop_movements
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_movement_change();

CREATE FUNCTION dwar_notify_player_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW IS DISTINCT FROM OLD THEN
    PERFORM dwar_notify_world_change(TG_ARGV[0], COALESCE(NEW.world_id, OLD.world_id),
      COALESCE(NEW.player_id, OLD.player_id));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_coin_change AFTER INSERT OR UPDATE OR DELETE ON coin_mint_events
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_player_change('village');
CREATE TRIGGER notify_battle_report_change AFTER INSERT OR UPDATE OR DELETE ON battle_report_recipients
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_player_change('reports');
CREATE TRIGGER notify_notice_report_change AFTER INSERT OR UPDATE OR DELETE ON notice_reports
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_player_change('reports');

-- The recent-battle seal depends on visible defender reports, independent of read status.
CREATE TRIGGER notify_defense_report_added AFTER INSERT ON battle_report_recipients
  FOR EACH ROW WHEN (NEW.role = 'defender' AND NEW.deleted_at IS NULL)
  EXECUTE FUNCTION dwar_notify_player_change('incomings');
CREATE TRIGGER notify_defense_report_removed AFTER DELETE ON battle_report_recipients
  FOR EACH ROW WHEN (OLD.role = 'defender' AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION dwar_notify_player_change('incomings');
CREATE TRIGGER notify_defense_report_visibility AFTER UPDATE ON battle_report_recipients
  FOR EACH ROW WHEN ((OLD.role = 'defender' AND OLD.deleted_at IS NULL)
    IS DISTINCT FROM (NEW.role = 'defender' AND NEW.deleted_at IS NULL))
  EXECUTE FUNCTION dwar_notify_player_change('incomings');

CREATE FUNCTION dwar_notify_mail_thread_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  shared_change boolean := TG_OP <> 'UPDATE';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    shared_change := (OLD.title, OLD.last_post_at, OLD.sender_status, OLD.recipient_status)
      IS DISTINCT FROM (NEW.title, NEW.last_post_at, NEW.sender_status, NEW.recipient_status);
  END IF;
  IF shared_change OR OLD.sender_deleted IS DISTINCT FROM NEW.sender_deleted THEN
    PERFORM dwar_notify_world_change('mail', COALESCE(NEW.world_id, OLD.world_id),
      COALESCE(NEW.sender_player_id, OLD.sender_player_id));
  END IF;
  IF shared_change OR OLD.recipient_deleted IS DISTINCT FROM NEW.recipient_deleted THEN
    PERFORM dwar_notify_world_change('mail', COALESCE(NEW.world_id, OLD.world_id),
      COALESCE(NEW.recipient_player_id, OLD.recipient_player_id));
  END IF;
  RETURN NULL;
END;
$$;

-- The game updates last_post_at on the thread in the same transaction as a reply.
CREATE TRIGGER notify_mail_thread_change AFTER INSERT OR UPDATE OR DELETE ON mail_threads
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_mail_thread_change();

CREATE FUNCTION dwar_notify_mail_block_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM dwar_notify_world_change('mail', COALESCE(NEW.world_id, OLD.world_id),
    COALESCE(NEW.blocker_player_id, OLD.blocker_player_id));
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_mail_block_change AFTER INSERT OR DELETE ON mail_blocks
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_mail_block_change();

CREATE FUNCTION dwar_notify_world_village_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'worlds' THEN
    PERFORM dwar_notify_world_change('village', NEW.id);
  ELSE
    PERFORM dwar_notify_world_change('village', COALESCE(NEW.world_id, OLD.world_id));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_world_settings AFTER UPDATE ON worlds
  FOR EACH ROW WHEN (OLD IS DISTINCT FROM NEW) EXECUTE FUNCTION dwar_notify_world_village_change();
CREATE TRIGGER notify_world_membership AFTER INSERT OR DELETE ON players
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_world_village_change();

CREATE FUNCTION dwar_notify_session_revoked() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('dwar_session_revoked', OLD.token_hash);
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_session_revoked AFTER DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION dwar_notify_session_revoked();

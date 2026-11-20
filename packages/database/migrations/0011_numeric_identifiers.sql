-- Convert entity identifiers atomically, retaining data and historical link aliases.
CREATE TABLE identifier_aliases (
  entity text NOT NULL, previous_id text NOT NULL, id integer NOT NULL,
  PRIMARY KEY (entity, previous_id), UNIQUE (entity, id), CHECK (id > 0)
);
CREATE TEMP TABLE _id_constraints ON COMMIT DROP AS
SELECT c.conrelid::regclass::text AS table_name, c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
WHERE n.nspname='public' AND c.contype IN ('f','c');
CREATE TEMP TABLE _id_columns ON COMMIT DROP AS
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND udt_name='uuid';
DO $$
DECLARE item record; ordering text;
BEGIN
  FOR item IN SELECT table_name FROM _id_columns WHERE column_name='id' ORDER BY table_name LOOP
    ordering := CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=item.table_name AND column_name='created_at')
      THEN 'created_at, id' ELSE 'id' END;
    EXECUTE format('INSERT INTO identifier_aliases(entity,previous_id,id) SELECT %L,id::text,row_number() OVER (ORDER BY %s)::integer FROM %I', item.table_name, ordering, item.table_name);
  END LOOP;
  FOR item IN SELECT * FROM _id_constraints LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', item.table_name, item.conname);
  END LOOP;
END $$;
CREATE FUNCTION pg_temp.convert_entity_id(entity_name text, previous uuid) RETURNS integer
LANGUAGE plpgsql STABLE STRICT AS $$
DECLARE converted integer;
BEGIN
  SELECT id INTO converted FROM identifier_aliases WHERE entity=entity_name AND previous_id=previous::text;
  IF converted IS NULL THEN RAISE EXCEPTION 'Unmapped identifier in %: %',entity_name,previous; END IF;
  RETURN converted;
END $$;
DO $$
DECLARE item record; target_table text; maximum integer;
BEGIN
  FOR item IN SELECT * FROM _id_columns ORDER BY table_name,column_name LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT',item.table_name,item.column_name);
    IF item.column_name='request_id' THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE text USING %I::text',item.table_name,item.column_name,item.column_name);
      CONTINUE;
    END IF;
    target_table := CASE
      WHEN item.column_name='id' THEN item.table_name
      WHEN item.column_name='world_id' THEN 'worlds'
      WHEN item.column_name='account_id' THEN 'accounts'
      WHEN item.column_name LIKE '%%village_id' THEN 'villages'
      WHEN item.column_name LIKE '%%player_id' THEN 'players'
      WHEN item.column_name LIKE '%%thread_id' THEN 'mail_threads'
      WHEN item.column_name='offer_id' THEN 'market_offers'
      ELSE NULL END;
    IF target_table IS NULL THEN RAISE EXCEPTION 'Unknown reference %.%',item.table_name,item.column_name; END IF;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE integer USING pg_temp.convert_entity_id(%L,%I)',item.table_name,item.column_name,target_table,item.column_name);
    IF item.column_name='id' THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY',item.table_name);
      EXECUTE format('SELECT coalesce(max(id),0) FROM %I',item.table_name) INTO maximum;
      PERFORM setval(pg_get_serial_sequence(item.table_name,'id'),greatest(maximum,1),maximum>0);
    END IF;
  END LOOP;
  FOR item IN SELECT * FROM _id_constraints LOOP
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',item.table_name,item.conname,item.definition);
  END LOOP;
END $$;

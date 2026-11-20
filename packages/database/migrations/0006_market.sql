CREATE TABLE market_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL, village_id uuid NOT NULL,
  request_id uuid NOT NULL, fingerprint text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_operation_request_idx UNIQUE(village_id, request_id),
  FOREIGN KEY(village_id, world_id) REFERENCES villages(id, world_id)
);
CREATE TABLE market_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL, village_id uuid NOT NULL,
  sell_resource text NOT NULL, buy_resource text NOT NULL, sell_amount integer NOT NULL, buy_amount integer NOT NULL,
  merchants integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz,
  accepted_at timestamptz, accepted_by_village_id uuid,
  UNIQUE(id,world_id), FOREIGN KEY(village_id,world_id) REFERENCES villages(id,world_id),
  FOREIGN KEY(accepted_by_village_id,world_id) REFERENCES villages(id,world_id),
  CONSTRAINT offer_valid_resources CHECK (sell_resource IN ('wood','stone','iron') AND buy_resource IN ('wood','stone','iron')),
  CONSTRAINT offer_valid_amounts CHECK (sell_amount BETWEEN 1 AND 235000 AND buy_amount BETWEEN 1 AND 235000 AND merchants = ceil(sell_amount / 1000.0)),
  CONSTRAINT offer_terminal_state CHECK ((accepted_at IS NULL) = (accepted_by_village_id IS NULL) AND (accepted_at IS NULL OR cancelled_at IS NULL))
);
CREATE INDEX offers_open_world_idx ON market_offers(world_id,created_at,id) WHERE accepted_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX offers_village_idx ON market_offers(village_id,world_id);
CREATE TABLE trade_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL,
  from_village_id uuid NOT NULL, to_village_id uuid NOT NULL, mode text NOT NULL, offer_id uuid,
  resources jsonb NOT NULL, merchants integer NOT NULL,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, delivered_at timestamptz, cancelled_at timestamptz,
  FOREIGN KEY(from_village_id,world_id) REFERENCES villages(id,world_id), FOREIGN KEY(to_village_id,world_id) REFERENCES villages(id,world_id),
  FOREIGN KEY(offer_id,world_id) REFERENCES market_offers(id,world_id),
  CONSTRAINT shipment_valid_route CHECK (from_village_id <> to_village_id AND ends_at > starts_at),
  CONSTRAINT shipment_valid_mode CHECK ((mode='normal' AND offer_id IS NULL) OR (mode='offer' AND offer_id IS NOT NULL)),
  CONSTRAINT shipment_terminal_state CHECK (delivered_at IS NULL OR cancelled_at IS NULL),
  CONSTRAINT shipment_valid_resources CHECK ((resources->>'wood')::integer >= 0 AND (resources->>'stone')::integer >= 0 AND (resources->>'iron')::integer >= 0 AND merchants > 0 AND merchants = ceil(((resources->>'wood')::numeric + (resources->>'stone')::numeric + (resources->>'iron')::numeric)/1000))
);
CREATE INDEX shipments_pending_idx ON trade_shipments(world_id,ends_at,id) WHERE delivered_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX shipments_origin_idx ON trade_shipments(from_village_id,world_id);
CREATE INDEX shipments_destination_idx ON trade_shipments(to_village_id,world_id);

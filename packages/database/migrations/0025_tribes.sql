-- Tribos: nome e tag únicos por mundo, membros com cargo e permissões, convites e registro de
-- eventos. Cada jogador pertence a no máximo uma tribo (a chave de tribe_members é o jogador).
CREATE TABLE tribes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL REFERENCES worlds (id),
  name text NOT NULL,
  tag text NOT NULL,
  -- Texto público da tribo (BBCode) e texto só para os membros (BBCode).
  description text NOT NULL DEFAULT '',
  internal_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tribes_name_check CHECK (char_length(name) BETWEEN 4 AND 25),
  CONSTRAINT tribes_tag_check CHECK (char_length(tag) BETWEEN 2 AND 6),
  CONSTRAINT tribes_description_check CHECK (char_length(description) <= 10000),
  CONSTRAINT tribes_internal_text_check CHECK (char_length(internal_text) <= 10000)
);
CREATE UNIQUE INDEX tribes_id_world_idx ON tribes (id, world_id);
CREATE UNIQUE INDEX tribes_name_idx ON tribes (world_id, lower(name));
CREATE UNIQUE INDEX tribes_tag_idx ON tribes (world_id, lower(tag));

CREATE TABLE tribe_members (
  player_id integer PRIMARY KEY,
  world_id integer NOT NULL,
  tribe_id integer NOT NULL,
  title text NOT NULL DEFAULT '',
  is_founder boolean NOT NULL DEFAULT false,
  can_lead boolean NOT NULL DEFAULT false,
  can_invite boolean NOT NULL DEFAULT false,
  can_diplomacy boolean NOT NULL DEFAULT false,
  can_mass_mail boolean NOT NULL DEFAULT false,
  can_moderate boolean NOT NULL DEFAULT false,
  can_hidden_forum boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tribe_members_title_check CHECK (char_length(title) <= 24),
  FOREIGN KEY (player_id, world_id) REFERENCES players (id, world_id),
  FOREIGN KEY (tribe_id, world_id) REFERENCES tribes (id, world_id) ON DELETE CASCADE
);
CREATE INDEX tribe_members_tribe_idx ON tribe_members (tribe_id);

CREATE TABLE tribe_invites (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL,
  tribe_id integer NOT NULL,
  player_id integer NOT NULL,
  invited_by integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tribe_id, world_id) REFERENCES tribes (id, world_id) ON DELETE CASCADE,
  FOREIGN KEY (player_id, world_id) REFERENCES players (id, world_id),
  FOREIGN KEY (invited_by, world_id) REFERENCES players (id, world_id),
  UNIQUE (tribe_id, player_id)
);
CREATE INDEX tribe_invites_player_idx ON tribe_invites (player_id);

CREATE TABLE tribe_events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  world_id integer NOT NULL,
  tribe_id integer NOT NULL,
  -- Texto com BBCode, por exemplo "[player]Ana[/player] entrou na tribo".
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tribe_id, world_id) REFERENCES tribes (id, world_id) ON DELETE CASCADE
);
CREATE INDEX tribe_events_recent_idx ON tribe_events (tribe_id, created_at DESC, id DESC);

-- Avisos de tribo (convite recebido, expulsão) aparecem na aba Outros dos relatórios.
ALTER TABLE notice_reports DROP CONSTRAINT notice_reports_kind_check;
ALTER TABLE notice_reports
  ADD CONSTRAINT notice_reports_kind_check CHECK (kind IN ('trade', 'support', 'medal', 'tribe'));

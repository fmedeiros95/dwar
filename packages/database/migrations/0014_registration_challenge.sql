-- Original registration sum (captcha.php / process.php), now expiring and single use.
CREATE TABLE registration_challenges (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  browser_key_hash text NOT NULL UNIQUE,
  answer integer NOT NULL CHECK (answer BETWEEN 2 AND 50),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX registration_challenges_expiry_idx ON registration_challenges (expires_at);

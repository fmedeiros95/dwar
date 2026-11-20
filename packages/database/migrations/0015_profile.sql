-- Perfil do jogador: gender/age/location são globais à conta;
-- personal_text e avatar são por mundo.
ALTER TABLE accounts ADD COLUMN gender text;
ALTER TABLE accounts ADD COLUMN age integer;
ALTER TABLE accounts ADD COLUMN location_text text;
ALTER TABLE accounts ADD CONSTRAINT accounts_gender_check CHECK (gender IS NULL OR gender IN ('m','f','x'));
ALTER TABLE accounts ADD CONSTRAINT accounts_age_check CHECK (age IS NULL OR age BETWEEN 0 AND 79);

ALTER TABLE players ADD COLUMN personal_text text;
ALTER TABLE players ADD COLUMN avatar_path text;

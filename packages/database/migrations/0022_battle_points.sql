-- Pontos de batalha (como no Speed Wars): unidades inimigas derrotadas, como atacante e como
-- defensor. O contador é atualizado a cada batalha e aqui é preenchido a partir dos relatórios
-- que já existem.
ALTER TABLE players
  ADD COLUMN units_killed_attack bigint NOT NULL DEFAULT 0,
  ADD COLUMN units_killed_defense bigint NOT NULL DEFAULT 0,
  ADD CONSTRAINT players_units_killed_check CHECK (units_killed_attack >= 0 AND units_killed_defense >= 0);

UPDATE players p SET units_killed_attack = k.total
FROM (
  SELECT (r.result->'from'->>'playerId')::integer AS player_id, sum(l.total) AS total
  FROM battle_reports r
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(value::bigint), 0) AS total FROM jsonb_each_text(r.result->'defenderLosses')
  ) l
  WHERE r.result->'from'->>'playerId' IS NOT NULL
  GROUP BY 1
) k
WHERE p.id = k.player_id;

UPDATE players p SET units_killed_defense = k.total
FROM (
  SELECT (r.result->'to'->>'playerId')::integer AS player_id, sum(l.total) AS total
  FROM battle_reports r
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(value::bigint), 0) AS total FROM jsonb_each_text(r.result->'attackerLosses')
  ) l
  WHERE r.result->'to'->>'playerId' IS NOT NULL
  GROUP BY 1
) k
WHERE p.id = k.player_id;

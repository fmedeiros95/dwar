-- Tesouraria (`treasury`) e Moleiro (`mill`): construções próprias do DWar.
-- Aldeias existentes passam a ter as duas no nível 0; não altera quem já as tem.
UPDATE villages
SET buildings = jsonb_build_object('treasury', 0, 'mill', 0) || buildings
WHERE NOT (buildings ? 'treasury' AND buildings ? 'mill');

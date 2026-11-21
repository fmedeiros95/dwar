-- Cada jogador apaga os próprios relatórios sem afetar os dos outros envolvidos na batalha.
ALTER TABLE battle_report_recipients ADD COLUMN deleted_at timestamptz;
CREATE INDEX battle_report_recipients_visible_idx
  ON battle_report_recipients (player_id, world_id, role)
  WHERE deleted_at IS NULL;

-- Adicionar coluna next_cursor para paginação incremental no TikTok
ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS next_cursor TEXT;

-- Adicionar coluna next_cursor para paginação incremental no Instagram
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS next_cursor TEXT;

-- Comentários explicando o uso
COMMENT ON COLUMN tiktok_accounts.next_cursor IS 'Cursor para continuar coleta de vídeos de onde parou';
COMMENT ON COLUMN instagram_accounts.next_cursor IS 'Cursor (max_id) para continuar coleta de posts de onde parou';
-- Adicionar novo campo platforms como array para aceitar múltiplas plataformas
-- Mantemos o campo platform original por compatibilidade
ALTER TABLE public.campaigns 
ADD COLUMN platforms text[] DEFAULT ARRAY[]::text[];

-- Migrar dados existentes do campo platform para platforms
UPDATE public.campaigns 
SET platforms = ARRAY[platform]
WHERE platforms = ARRAY[]::text[];

-- Criar índice para busca mais eficiente em múltiplas plataformas
CREATE INDEX IF NOT EXISTS idx_campaigns_platforms ON public.campaigns USING GIN(platforms);
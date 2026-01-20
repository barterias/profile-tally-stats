-- Adicionar coluna is_private na tabela campaigns
ALTER TABLE public.campaigns ADD COLUMN is_private boolean DEFAULT false NOT NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.campaigns.is_private IS 'Quando true, a campanha só aparece para admins, donos e participantes aprovados';
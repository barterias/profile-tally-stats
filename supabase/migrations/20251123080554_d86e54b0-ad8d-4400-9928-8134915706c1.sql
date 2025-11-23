-- Habilitar Realtime para a tabela pending_users
ALTER TABLE public.pending_users REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_users;
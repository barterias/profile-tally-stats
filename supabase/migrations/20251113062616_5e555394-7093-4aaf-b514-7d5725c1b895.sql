-- Atualizar políticas RLS para permitir que usuários autenticados cadastrem vídeos

-- Drop das políticas antigas de vídeos
DROP POLICY IF EXISTS "Only admins can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Only admins can update videos" ON public.videos;
DROP POLICY IF EXISTS "Only admins can delete videos" ON public.videos;

-- Drop das políticas antigas de creators
DROP POLICY IF EXISTS "Only admins can insert creators" ON public.creators;
DROP POLICY IF EXISTS "Only admins can update creators" ON public.creators;
DROP POLICY IF EXISTS "Only admins can delete creators" ON public.creators;

-- Novas políticas para vídeos - permitir usuários autenticados
CREATE POLICY "Authenticated users can insert videos" 
ON public.videos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update videos" 
ON public.videos 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete videos" 
ON public.videos 
FOR DELETE 
TO authenticated
USING (true);

-- Novas políticas para creators - permitir usuários autenticados
CREATE POLICY "Authenticated users can insert creators" 
ON public.creators 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update creators" 
ON public.creators 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete creators" 
ON public.creators 
FOR DELETE 
TO authenticated
USING (true);
-- Script para corrigir as políticas RLS da tabela file_uploads

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow authenticated read access to file_uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Allow admins to manage file_uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Allow service role to insert file_uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Allow admins to delete file_uploads" ON public.file_uploads;

-- Recriar políticas corretas

-- Política: todos usuários autenticados podem ler
CREATE POLICY "Allow authenticated read access to file_uploads"
ON public.file_uploads
FOR SELECT
TO authenticated
USING (true);

-- Política: permitir inserção via service (sem verificação de admin)
CREATE POLICY "Allow service role to insert file_uploads"
ON public.file_uploads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política: apenas admins podem deletar
CREATE POLICY "Allow admins to delete file_uploads"
ON public.file_uploads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id = (
      SELECT id FROM public.users WHERE email = auth.jwt()->>'email'
    )
  )
);

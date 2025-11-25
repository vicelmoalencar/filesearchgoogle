-- Drop old policy if it exists
DROP POLICY IF EXISTS "Allow admins to manage file_uploads" ON public.file_uploads;

-- Create new policies
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

-- Criar tabela para rastrear uploads no File Search Store
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL,
  gemini_document_name TEXT NOT NULL, -- Nome do documento no File Search Store
  gemini_store_name TEXT NOT NULL, -- Nome do store onde foi salvo
  uploaded_by INTEGER REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON public.file_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON public.file_uploads(uploaded_by);

-- Habilitar RLS
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

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

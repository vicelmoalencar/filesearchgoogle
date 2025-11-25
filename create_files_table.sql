-- Criar tabela para armazenar metadados dos arquivos
CREATE TABLE IF NOT EXISTS public.files (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Caminho no Supabase Storage
  gemini_file_uri TEXT, -- URI do arquivo no Gemini (pode expirar)
  gemini_file_name TEXT, -- Nome do arquivo no Gemini
  gemini_expires_at TIMESTAMPTZ, -- Quando o arquivo expira no Gemini
  uploaded_by INTEGER REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_files_gemini_expires_at ON public.files(gemini_expires_at);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files(uploaded_by);

-- Habilitar RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Política: todos usuários autenticados podem ler
CREATE POLICY "Allow authenticated read access to files"
ON public.files
FOR SELECT
TO authenticated
USING (true);

-- Política: apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Allow admins to manage files"
ON public.files
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id = auth.uid()::integer
  )
);

-- Criar bucket no Supabase Storage para os arquivos
-- Execute este comando manualmente no console do Supabase ou via código:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('file-search', 'file-search', false);

-- Políticas de Storage: permitir admins fazerem upload
-- CREATE POLICY "Allow admins to upload files"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'file-search' AND
--   EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()::integer)
-- );

-- CREATE POLICY "Allow authenticated users to read files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'file-search');

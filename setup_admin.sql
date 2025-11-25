-- Script para verificar e configurar a tabela admins no Supabase
-- Execute este SQL no SQL Editor do Supabase

-- 1. Ver a estrutura da tabela admins
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admins';

-- 2. Ver todos os registros na tabela admins
SELECT * FROM admins;

-- 3. Ver todos os usuários cadastrados no Auth
SELECT id, email, created_at
FROM auth.users;

-- 4. Para adicionar o usuário antoniovicelmo@gmail.com como admin,
--    primeiro encontre o UUID dele:
SELECT id as user_uuid, email
FROM auth.users
WHERE email = 'antoniovicelmo@gmail.com';

-- 5. Depois, insira na tabela admins (ajuste conforme a estrutura da sua tabela):
-- IMPORTANTE: Execute este INSERT apenas depois de verificar o UUID do usuário acima

-- Se a tabela admins tem apenas a coluna usuario_id:
-- INSERT INTO admins (usuario_id)
-- SELECT id FROM auth.users WHERE email = 'antoniovicelmo@gmail.com';

-- Se a tabela admins tem outras colunas, ajuste conforme necessário:
-- INSERT INTO admins (usuario_id, nome, email, etc...)
-- VALUES ('UUID_DO_USUARIO_AQUI', 'Antonio Vicelmo', 'antoniovicelmo@gmail.com');

-- 6. Verificar se o usuário foi adicionado
-- SELECT * FROM admins WHERE usuario_id IN (
--   SELECT id FROM auth.users WHERE email = 'antoniovicelmo@gmail.com'
-- );

-- Execute este SQL para ver a estrutura da tabela admins

-- Ver todas as colunas da tabela admins
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admins'
ORDER BY ordinal_position;

-- Ver alguns registros da tabela admins para entender a estrutura
SELECT * FROM admins LIMIT 5;

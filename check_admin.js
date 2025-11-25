// Script para verificar e configurar admin no Supabase
// Execute com: node check_admin.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ghdfouqzasvxlptbjkin.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZGZvdXF6YXN2eGxwdGJqa2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDI1NzIsImV4cCI6MjA3NjgxODU3Mn0.uaFHo-mHWQBBiUD2BTYeKGmBAIzy9p8p3B9DR67YNTM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
  console.log('=== Verificando configuração de admin ===\n');

  // 1. Buscar usuário pelo email
  const email = 'antoniovicelmo@gmail.com';
  console.log(`1. Buscando usuário com email: ${email}`);

  // Primeiro, vamos ver se há um usuário logado
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.log('⚠️  Nenhum usuário logado. Faça login primeiro.');
    console.log('\nPara fazer login, execute:');
    console.log(`
const { data, error } = await supabase.auth.signInWithPassword({
  email: '${email}',
  password: 'sua_senha'
});
console.log('User ID:', data.user.id);
    `);
    return;
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  console.log(`✓ Usuário logado: ${userEmail}`);
  console.log(`✓ User ID: ${userId}\n`);

  // 2. Verificar se existe na tabela admins
  console.log('2. Verificando tabela admins...');
  const { data: adminData, error: adminError } = await supabase
    .from('admins')
    .select('*')
    .eq('usuario_id', userId);

  if (adminError) {
    console.error('❌ Erro ao consultar tabela admins:', adminError.message);
    return;
  }

  if (adminData && adminData.length > 0) {
    console.log('✓ Usuário encontrado na tabela admins:', adminData);
  } else {
    console.log('⚠️  Usuário NÃO encontrado na tabela admins');
    console.log('\n3. Para adicionar o usuário como admin, execute no SQL Editor do Supabase:');
    console.log(`
INSERT INTO admins (usuario_id)
VALUES ('${userId}');
    `);
    console.log('\nOu, se a tabela admins tiver outras colunas obrigatórias, ajuste conforme necessário.');
  }

  // 3. Listar todos os admins
  console.log('\n4. Listando todos os admins na tabela:');
  const { data: allAdmins, error: listError } = await supabase
    .from('admins')
    .select('*');

  if (listError) {
    console.error('❌ Erro ao listar admins:', listError.message);
  } else {
    console.log(allAdmins);
  }
}

checkAdmin().catch(console.error);

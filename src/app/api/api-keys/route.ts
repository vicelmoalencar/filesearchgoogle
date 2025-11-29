import { NextResponse } from 'next/server';
import { readApiKeys } from '@/lib/api-keys-env';

// GET - Retorna as chaves de API disponíveis (sem expor as chaves reais)
export async function GET() {
  try {
    const keys = readApiKeys();

    // Retornar sem expor as chaves reais
    const safeKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      theme: key.theme,
      description: key.description,
      createdAt: key.createdAt
    }));

    return NextResponse.json({ keys: safeKeys });
  } catch (error) {
    console.error('Erro ao listar chaves:', error);
    return NextResponse.json(
      { error: 'Erro ao listar chaves de API' },
      { status: 500 }
    );
  }
}

// As operações POST, PUT e DELETE não são suportadas
// As chaves devem ser gerenciadas via variáveis de ambiente no Easypanel
export async function POST() {
  return NextResponse.json(
    {
      error: 'Operação não suportada',
      message: 'As chaves de API devem ser configuradas via variáveis de ambiente no Easypanel. Configure API_KEY_N_NAME, API_KEY_N_KEY, API_KEY_N_THEME, etc.'
    },
    { status: 405 }
  );
}

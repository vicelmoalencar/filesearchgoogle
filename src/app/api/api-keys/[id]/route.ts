import { NextResponse } from 'next/server';
import { getApiKeyById } from '@/lib/api-keys-env';

// GET - Retorna uma chave específica (sem expor a chave real)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const key = getApiKeyById(id);

    if (!key) {
      return NextResponse.json(
        { error: 'Chave não encontrada' },
        { status: 404 }
      );
    }

    // Retornar sem expor a chave real
    return NextResponse.json({
      key: {
        id: key.id,
        name: key.name,
        theme: key.theme,
        description: key.description,
        customPrompt: key.customPrompt,
        createdAt: key.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao obter chave:', error);
    return NextResponse.json(
      {
        error: 'Erro ao obter chave',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// PUT, DELETE não suportados - chaves são gerenciadas via variáveis de ambiente
export async function PUT() {
  return NextResponse.json(
    {
      error: 'Operação não suportada',
      message: 'As chaves de API e prompts devem ser configurados via variáveis de ambiente no Easypanel. Use API_KEY_N_PROMPT para configurar prompts customizados.'
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Operação não suportada',
      message: 'As chaves de API devem ser gerenciadas via variáveis de ambiente no Easypanel.'
    },
    { status: 405 }
  );
}

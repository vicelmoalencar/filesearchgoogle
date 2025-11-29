import { NextResponse } from 'next/server';
import { readApiKeys, addApiKey } from '@/lib/api-keys-storage';

// GET - Retorna todas as chaves
export async function GET() {
  try {
    const keys = readApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Erro ao ler chaves:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar chaves' },
      { status: 500 }
    );
  }
}

// POST - Adiciona nova chave
export async function POST(request: Request) {
  try {
    const { name, apiKey, theme, description } = await request.json();

    if (!name || !apiKey || !theme) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios faltando',
          details: 'Nome, chave API e tema são obrigatórios'
        },
        { status: 400 }
      );
    }

    const result = addApiKey({ name, apiKey, theme, description });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      key: result.key,
      message: 'Chave adicionada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao adicionar chave:', error);
    return NextResponse.json(
      {
        error: 'Erro ao adicionar chave',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

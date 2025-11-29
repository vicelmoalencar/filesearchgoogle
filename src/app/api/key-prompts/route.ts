import { NextRequest, NextResponse } from 'next/server';
import { saveKeyPrompt, getKeyPrompt, deleteKeyPrompt } from '@/lib/key-prompts-storage';

// POST - Salvar prompt customizado para uma chave
export async function POST(request: NextRequest) {
  try {
    const { keyId, prompt } = await request.json();

    if (!keyId) {
      return NextResponse.json(
        { error: 'keyId é obrigatório' },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt inválido ou vazio' },
        { status: 400 }
      );
    }

    const result = saveKeyPrompt(keyId, prompt);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao salvar prompt', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt customizado salvo com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar prompt customizado:', error);
    return NextResponse.json(
      {
        error: 'Erro ao salvar prompt',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE - Remover prompt customizado de uma chave
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json(
        { error: 'keyId é obrigatório' },
        { status: 400 }
      );
    }

    const result = deleteKeyPrompt(keyId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao deletar prompt', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt customizado removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar prompt customizado:', error);
    return NextResponse.json(
      {
        error: 'Erro ao deletar prompt',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

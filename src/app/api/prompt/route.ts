import { NextResponse } from 'next/server';
import { readPrompt, writePrompt } from '@/lib/prompt-storage';

// GET - Retorna o prompt atual
export async function GET() {
  try {
    const prompt = readPrompt();
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Erro ao ler prompt:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar prompt' },
      { status: 500 }
    );
  }
}

// POST - Atualiza o prompt
export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        {
          error: 'Prompt inválido',
          details: 'O prompt não pode estar vazio e deve ser uma string'
        },
        { status: 400 }
      );
    }

    if (prompt.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Prompt vazio',
          details: 'O prompt não pode conter apenas espaços em branco'
        },
        { status: 400 }
      );
    }

    const result = writePrompt(prompt);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Erro ao salvar prompt',
          details: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.usedFallback
        ? 'Prompt salvo em memória (temporário). Configure um volume persistente no Easypanel em /app/data para tornar as alterações permanentes.'
        : 'Prompt atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar prompt:', error);
    return NextResponse.json(
      {
        error: 'Erro ao salvar prompt',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Exportar função para obter o prompt (usado em outras rotas)
export function getSystemPrompt(): string {
  return readPrompt();
}

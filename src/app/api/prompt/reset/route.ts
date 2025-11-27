import { NextResponse } from 'next/server';
import { DEFAULT_PROMPT, writePrompt } from '@/lib/prompt-storage';

export async function POST() {
  try {
    const result = writePrompt(DEFAULT_PROMPT);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Erro ao restaurar prompt',
          details: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt: DEFAULT_PROMPT,
      message: result.usedFallback
        ? 'Prompt restaurado em memória (temporário). Configure um volume persistente no Easypanel em /app/data.'
        : 'Prompt restaurado para o padrão'
    });
  } catch (error) {
    console.error('Erro ao restaurar prompt:', error);
    return NextResponse.json(
      {
        error: 'Erro ao restaurar prompt',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

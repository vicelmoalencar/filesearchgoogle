import { NextResponse } from 'next/server';
import { updateApiKey, deleteApiKey } from '@/lib/api-keys-storage';

// PUT - Atualiza uma chave existente
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, apiKey, theme, description, customPrompt } = await request.json();
    const { id } = await params;

    const updates: any = {};
    if (name) updates.name = name;
    if (apiKey) updates.apiKey = apiKey;
    if (theme) updates.theme = theme;
    if (description !== undefined) updates.description = description;
    if (customPrompt !== undefined) updates.customPrompt = customPrompt;

    const result = updateApiKey(id, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chave atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar chave:', error);
    return NextResponse.json(
      {
        error: 'Erro ao atualizar chave',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove uma chave
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Não permitir deletar a chave padrão
    if (id === 'default') {
      return NextResponse.json(
        { error: 'Não é possível excluir a chave padrão' },
        { status: 400 }
      );
    }

    const result = deleteApiKey(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chave excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir chave:', error);
    return NextResponse.json(
      {
        error: 'Erro ao excluir chave',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getArticleById } from '@/lib/articles-storage';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const article = await getArticleById(id);

        if (!article) {
            return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ article });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

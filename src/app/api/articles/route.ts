import { NextRequest, NextResponse } from 'next/server';
import { listPublishedArticles, setPublished } from '@/lib/articles-storage';

// GET - lista artigos publicados (público)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tag = searchParams.get('tag') || null;
        const search = searchParams.get('search') || null;
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = 12;

        const { articles, total } = await listPublishedArticles(page, limit, tag, search);

        return NextResponse.json({ articles, total });
    } catch (error) {
        console.error('[Articles GET]', error);
        return NextResponse.json({ error: 'Erro ao buscar artigos' }, { status: 500 });
    }
}

// PATCH - alterna status de publicação
export async function PATCH(request: NextRequest) {
    try {
        const { id, published } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const ok = await setPublished(id, !!published);
        if (!ok) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

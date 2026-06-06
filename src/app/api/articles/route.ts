import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAnon, createServerSupabaseAdmin } from '@/lib/supabase-server';

// GET - lista artigos publicados (público)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tag = searchParams.get('tag');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = 12;
        const offset = (page - 1) * limit;

        const supabase = createServerSupabaseAnon();

        let query = supabase
            .from('articles')
            .select('id, title, topic, tags, user_email, created_at, tone, length', { count: 'exact' })
            .eq('published', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (tag) {
            query = query.contains('tags', [tag]);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('[Articles GET]', error.message);
            return NextResponse.json({ error: 'Erro ao buscar artigos' }, { status: 500 });
        }

        return NextResponse.json({ articles: data || [], total: count ?? 0 });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// PATCH - alterna status de publicação
export async function PATCH(request: NextRequest) {
    try {
        const { id, published } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const supabase = createServerSupabaseAdmin();
        const { error } = await supabase
            .from('articles')
            .update({ published: !!published, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('[Articles PATCH]', error.message);
            return NextResponse.json({ error: 'Erro ao atualizar artigo' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAnon } from '@/lib/supabase-server';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createServerSupabaseAnon();
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .eq('published', true)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ article: data });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

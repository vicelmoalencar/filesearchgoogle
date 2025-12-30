import { NextRequest, NextResponse } from 'next/server';
import { checkAndDeductCredits } from '@/lib/creditos-centralizados';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({
                success: false,
                error: 'Email é obrigatório'
            }, { status: 400 });
        }

        console.log(`\n🔍 [DEBUG API] Iniciando verificação para ${email}`);

        // Chamar checkAndDeductCredits e retornar resultado detalhado
        const result = await checkAndDeductCredits(email);

        console.log(`✅ [DEBUG API] Resultado:`, result);

        return NextResponse.json({
            success: true,
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [DEBUG API] Erro:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

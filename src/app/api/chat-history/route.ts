import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import pool from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('[Chat History] No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('[Chat History] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Chat History] User authenticated:', user.email);

    // Parâmetros de busca e paginação
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const model = searchParams.get('model') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const offset = (page - 1) * limit;

    // Construir query com filtros
    let whereConditions = ['user_email = $1'];
    const queryParams: any[] = [user.email];
    let paramCounter = 2;

    if (search) {
      // Buscar em prompt_text, response_text ou model
      whereConditions.push(`(prompt_text ILIKE $${paramCounter} OR response_text ILIKE $${paramCounter} OR model ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    if (model) {
      // Filtrar por modelo
      whereConditions.push(`model = $${paramCounter}`);
      queryParams.push(model);
      paramCounter++;
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramCounter}`);
      queryParams.push(startDate);
      paramCounter++;
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramCounter}`);
      queryParams.push(endDate + ' 23:59:59');
      paramCounter++;
    }

    const whereClause = whereConditions.join(' AND ');

    console.log('[Chat History] Query params:', { whereClause, queryParams, page, limit });

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM token_usage
      WHERE ${whereClause}
    `;

    console.log('[Chat History] Executing count query...');
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    console.log('[Chat History] Total records found:', total);

    // Buscar registros paginados
    const dataQuery = `
      SELECT
        id,
        user_email as user_id,
        api_key_name as platform,
        model,
        prompt_text as prompt,
        response_text as response,
        prompt_tokens as input_tokens,
        completion_tokens as output_tokens,
        0 as audio_input_tokens,
        0 as audio_output_tokens,
        total_tokens,
        estimated_cost as input_cost_brl,
        0 as output_cost_brl,
        0 as audio_input_cost_brl,
        0 as audio_output_cost_brl,
        estimated_cost as total_cost_brl,
        created_at
      FROM token_usage
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    // Buscar modelos disponíveis para filtro
    const modelsQuery = `
      SELECT DISTINCT model
      FROM token_usage
      WHERE user_email = $1 AND model IS NOT NULL
      ORDER BY model
    `;
    const modelsResult = await pool.query(modelsQuery, [user.email]);
    const availableModels = modelsResult.rows.map((row: any) => row.model).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        items: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: {
          availableModels
        }
      }
    });

  } catch (error: any) {
    console.error('[Chat History] Error fetching chat history:', error);
    console.error('[Chat History] Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to fetch chat history',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

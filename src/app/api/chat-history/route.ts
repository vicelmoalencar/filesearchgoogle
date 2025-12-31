import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { pool } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    let whereConditions = ['user_id = $1'];
    const queryParams: any[] = [user.email];
    let paramCounter = 2;

    if (search) {
      whereConditions.push(`(prompt ILIKE $${paramCounter} OR response ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    if (model) {
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

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM usage_tracking
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Buscar registros paginados
    const dataQuery = `
      SELECT
        id,
        user_id,
        platform,
        model,
        prompt,
        response,
        input_tokens,
        output_tokens,
        audio_input_tokens,
        audio_output_tokens,
        total_tokens,
        input_cost_brl,
        output_cost_brl,
        audio_input_cost_brl,
        audio_output_cost_brl,
        total_cost_brl,
        created_at
      FROM usage_tracking
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    // Buscar modelos disponíveis para filtro
    const modelsQuery = `
      SELECT DISTINCT model
      FROM usage_tracking
      WHERE user_id = $1
      ORDER BY model
    `;
    const modelsResult = await pool.query(modelsQuery, [user.email]);
    const availableModels = modelsResult.rows.map(row => row.model);

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
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history', details: error.message },
      { status: 500 }
    );
  }
}

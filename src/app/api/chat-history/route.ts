import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Pool } from 'pg';

// Pool de conexões para o banco Creditos_Ensinoplus (onde está usage_tracking)
const connectionString = process.env.DATABASE_URL_CREDITOS?.replace('postgresql+psycopg2://', 'postgresql://');
const creditosPool = new Pool({
  connectionString: connectionString,
  ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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
    let whereConditions = ['ut.user_email = $1'];
    const queryParams: any[] = [user.email];
    let paramCounter = 2;

    if (search) {
      // Buscar no metadata (que pode conter apiKeyName) ou no nome do modelo
      whereConditions.push(`(ut.metadata::text ILIKE $${paramCounter} OR am.model_name ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    if (model) {
      // Filtrar por nome do modelo
      whereConditions.push(`am.model_name = $${paramCounter}`);
      queryParams.push(model);
      paramCounter++;
    }

    if (startDate) {
      whereConditions.push(`ut.created_at >= $${paramCounter}`);
      queryParams.push(startDate);
      paramCounter++;
    }

    if (endDate) {
      whereConditions.push(`ut.created_at <= $${paramCounter}`);
      queryParams.push(endDate + ' 23:59:59');
      paramCounter++;
    }

    const whereClause = whereConditions.join(' AND ');

    console.log('[Chat History] Query params:', { whereClause, queryParams, page, limit });

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM usage_tracking ut
      LEFT JOIN ai_models am ON ut.model_id = am.id
      WHERE ${whereClause}
    `;

    console.log('[Chat History] Executing count query...');
    const countResult = await creditosPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    console.log('[Chat History] Total records found:', total);

    // Buscar registros paginados com JOIN para pegar nome do modelo
    const dataQuery = `
      SELECT
        ut.id,
        ut.user_email as user_id,
        ut.platform_id,
        am.model_name as model,
        am.provider,
        '' as prompt,
        '' as response,
        ut.input_tokens,
        ut.output_tokens,
        COALESCE(ut.audio_tokens, 0) as audio_input_tokens,
        0 as audio_output_tokens,
        ut.total_tokens,
        ut.cost_input_brl as input_cost_brl,
        ut.cost_output_brl as output_cost_brl,
        COALESCE(ut.cost_audio_brl, 0) as audio_input_cost_brl,
        0 as audio_output_cost_brl,
        ut.total_cost_brl,
        ut.created_at,
        ut.metadata
      FROM usage_tracking ut
      LEFT JOIN ai_models am ON ut.model_id = am.id
      WHERE ${whereClause}
      ORDER BY ut.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await creditosPool.query(dataQuery, queryParams);

    // Buscar modelos disponíveis para filtro
    const modelsQuery = `
      SELECT DISTINCT am.model_name as model
      FROM usage_tracking ut
      LEFT JOIN ai_models am ON ut.model_id = am.id
      WHERE ut.user_email = $1 AND am.model_name IS NOT NULL
      ORDER BY model
    `;
    const modelsResult = await creditosPool.query(modelsQuery, [user.email]);
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

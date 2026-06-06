import { createClient } from '@supabase/supabase-js';

// Client com service role key (bypass RLS) — uso exclusivo em server routes
export function createServerSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Client com anon key — para leituras públicas
export function createServerSupabaseAnon() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anonKey, { auth: { persistSession: false } });
}

/**
 * Extrai o email do payload do JWT sem verificação de assinatura.
 * Usado exclusivamente para tracking de créditos (não para controle de acesso).
 */
export function getEmailFromAuthHeader(authHeader: string | null): string | null {
    if (!authHeader) return null;
    try {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const payloadB64 = token.split('.')[1];
        if (!payloadB64) return null;
        // base64url → base64
        const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(base64, 'base64').toString('utf-8');
        const payload = JSON.parse(json);
        return payload.email || null;
    } catch {
        return null;
    }
}

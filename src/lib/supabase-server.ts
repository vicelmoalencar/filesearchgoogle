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

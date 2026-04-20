const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] ? `https://${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0]}` : null;
// Nota: Se não houver SUPABASE_URL explicitamente, tentamos inferir do DATABASE_URL ou usamos o que o usuário fornecer.
// No entanto, é melhor pedir para o usuário configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env do backend.

const url = process.env.SUPABASE_URL || 'https://kdtlixlmlhrjlyyeiqzu.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
    console.warn('[SUPABASE] SUPABASE_SERVICE_ROLE_KEY não configurada. Verificação de tokens pode falhar.');
}

const supabase = createClient(url, serviceKey || '');

module.exports = supabase;

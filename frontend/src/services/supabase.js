import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no .env');
}

// Inicializa o cliente apenas se tiver as credenciais, para evitar erro de "URL is required"
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { auth: { getSession: async () => ({ data: { session: null } }), signInWithOAuth: async () => ({ error: new Error('Supabase não configurado') }), signOut: async () => {} } };

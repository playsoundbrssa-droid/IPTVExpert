import { create } from 'zustand';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

export const useUserStore = create((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: false,

    // Initialize: check if stored token is still valid
    init: async () => {
        // 1. Check local storage token (standard flow)
        const token = localStorage.getItem('token');
        
        // 2. Check Supabase session (after redirect)
        console.log('[AUTH] Verificando sessão Supabase...');
        const { data: { session }, error: sbError } = await supabase.auth.getSession();
        
        if (sbError) console.error('[AUTH] Erro ao buscar sessão Supabase:', sbError);

        if (session) {
            console.log('[AUTH] Sessão Supabase ativa encontrada para:', session.user?.email);
            if (!token) {
                console.log('[AUTH] Token local ausente. Sincronizando com backend...');
                const result = await get().googleSupabaseLogin(session);
                if (result.success) {
                    console.log('[AUTH] Sincronização Supabase realizada com sucesso.');
                    return;
                }
            }
        } else {
            console.log('[AUTH] Nenhuma sessão Supabase ativa.');
        }

        if (!token) {
            console.log('[AUTH] Nenhum token local ou sessão Supabase. Usuário não autenticado.');
            return;
        }

        try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const { data } = await api.get('/auth/me');
            set({ user: data.user, token, isAuthenticated: true });
        } catch {
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            set({ user: null, token: null, isAuthenticated: false });
        }
    },

    // Login with email/password
    login: async (email, password) => {
        set({ loading: true });
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
            return { success: true };
        } catch (error) {
            set({ loading: false });
            return { success: false, message: error.response?.data?.message || 'Erro ao fazer login.' };
        }
    },

    // Register
    register: async (name, email, password) => {
        set({ loading: true });
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
            return { success: true };
        } catch (error) {
            set({ loading: false });
            return { success: false, message: error.response?.data?.message || 'Erro ao registrar.' };
        }
    },

    // Google login (from direct ID Token)
    googleLogin: async (credential) => {
        set({ loading: true });
        try {
            const { data } = await api.post('/auth/google', { credential });
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
            return { success: true };
        } catch (error) {
            set({ loading: false });
            return { success: false, message: error.response?.data?.message || 'Erro no login Google.' };
        }
    },

    // Google login (from Supabase Session)
    googleSupabaseLogin: async (session) => {
        set({ loading: true });
        console.log('[AUTH] Iniciando googleSupabaseLogin...');
        try {
            // Envia os dados do usuário do Supabase para o nosso backend criar/vincular a conta
            const response = await api.post('/auth/google-supabase', { 
                user: session.user,
                access_token: session.access_token 
            });
            
            const { data } = response;
            console.log('[AUTH] Backend respondeu com sucesso:', data.user?.email);
            
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
            return { success: true };
        } catch (error) {
            console.error('[AUTH] Erro na sincronização backend:', error.response?.data || error.message);
            set({ loading: false });
            return { success: false, message: error.response?.data?.message || 'Erro ao sincronizar com Supabase.' };
        }
    },

    // Logout
    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
    },

    // Check if user is admin
    isAdmin: () => get().user?.role === 'admin'
}));
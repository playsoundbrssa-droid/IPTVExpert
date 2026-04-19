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
        const { data: { session } } = await supabase.auth.getSession();

        if (session && !token) {
            // User just returned from Google OAuth redirect on Supabase
            console.log('[AUTH] Sessão Supabase detectada. Vinculando...');
            const result = await get().googleSupabaseLogin(session);
            if (result.success) return;
        }

        if (!token) return;

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
        try {
            // Envia os dados do usuário do Supabase para o nosso backend criar/vincular a conta
            const { data } = await api.post('/auth/google-supabase', { 
                user: session.user,
                access_token: session.access_token 
            });
            
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
            return { success: true };
        } catch (error) {
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
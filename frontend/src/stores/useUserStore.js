import { create } from 'zustand';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { usePlaylistManagerStore } from './usePlaylistManagerStore';
import { usePlaylistStore } from './usePlaylistStore';

export const useUserStore = create((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: false,

    // Initialize: check if stored token is still valid
    init: async () => {
        set({ loading: true });
        
        // 1. Tenta pegar a sessão atual do Supabase
        console.log('[AUTH] Verificando sessão do Supabase...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('[AUTH] Erro no Supabase:', sessionError.message);
        }

        // 2. Ouvinte para mudanças (Redirect/Login flow)
        supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log(`[AUTH] Evento Supabase: ${event}`);
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession) {
                await get().socialSyncLogin(newSession);
            } else if (event === 'SIGNED_OUT') {
                get().logout();
            }
        });

        // 3. Se temos uma sessão ativa, sincronizamos com o backend
        if (session) {
            await get().socialSyncLogin(session);
            set({ loading: false });
            return;
        }

        // 4. Fallback: Se não tem sessão mas tem token local, tenta validar
        const localToken = localStorage.getItem('token');
        if (localToken) {
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${localToken}`;
                const { data } = await api.get('/auth/me');
                set({ user: data.user, token: localToken, isAuthenticated: true });
                usePlaylistManagerStore.getState().syncWithCloud();
            } catch (err) {
                console.error('[AUTH] Token local inválido ou usuário removido:', err.response?.status);
                // Só limpa se ainda for o mesmo token (evita race conditions)
                if (localStorage.getItem('token') === localToken) {
                    get().logout();
                }
            }
        }
        
        set({ loading: false });
    },

    // Login with email/password
    login: async (email, password) => {
        set({ loading: true });
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
            // Fetch cloud playlists async
            usePlaylistManagerStore.getState().syncWithCloud();
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
            usePlaylistManagerStore.getState().syncWithCloud();
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
            usePlaylistManagerStore.getState().syncWithCloud();
            return { success: true };
        } catch (error) {
            set({ loading: false });
            return { success: false, message: error.response?.data?.message || 'Erro no login Google.' };
        }
    },

    // Sincronização Social (Google, Apple, etc via Supabase Session)
    socialSyncLogin: async (session) => {
        set({ loading: true });
        console.log('[AUTH] Iniciando socialSyncLogin...');
        try {
            // Envia os dados do usuário do Supabase para o nosso backend criar/vincular a conta
            const response = await api.post('/auth/social-sync', { 
                user: session.user,
                provider: session.user?.app_metadata?.provider || 'google'
            });
            
            const { data } = response;
            console.log('[AUTH] Backend respondeu com sucesso:', data.user?.email);
            
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
            
            // Sincroniza playlists na nuvem
            usePlaylistManagerStore.getState().syncWithCloud();
            return { success: true };
        } catch (error) {
            console.error('[AUTH] Erro na sincronização backend:', error.response?.data || error.message);
            set({ loading: false });
            return { success: false, message: error.response?.data?.message || 'Erro ao sincronizar login com o servidor.' };
        }
    },

    // Logout
    logout: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
        
        // Wipe local device lists so next user doesn't see them
        usePlaylistManagerStore.getState().clearLocalPlaylists();
        usePlaylistStore.getState().clearPlaylist();
    },

    // Check if user is admin
    isAdmin: () => get().user?.role === 'admin'
}));
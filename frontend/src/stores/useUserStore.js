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
        const token = localStorage.getItem('token');
        
        // 1. TENTA CAPTURAR O TOKEN DIRETAMENTE DA URL (Fallback de emergência)
        if (window.location.hash && window.location.hash.includes('access_token')) {
            console.log('[AUTH] Token detectado na URL! Processando hash manualmente...');
        }

        // 2. Tenta pegar a sessão atual imediatamente
        console.log('[AUTH] Verificando sessão inicial do Supabase...');
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('[AUTH] Erro ao buscar sessão do Supabase:', sessionError.message);
        }

        if (initialSession && !get().isAuthenticated) {
            console.log('[AUTH] Sessão inicial detectada. Sincronizando com backend...');
            await get().socialSyncLogin(initialSession);
        }

        // 3. Ouvinte para mudanças de autenticação do Supabase (Redirect flow)
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AUTH] Evento Supabase: ${event}`);
            
            if (event === 'SIGNED_IN' && session && !get().isAuthenticated) {
                console.log('[AUTH] Login detectado via evento. Sincronizando...');
                await get().socialSyncLogin(session);
            }
        });

        // 2. Se já tivermos um token local, valida ele
        if (token) {
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const { data } = await api.get('/auth/me');
                set({ user: data.user, token, isAuthenticated: true });
                // Fetch cloud playlists async
                usePlaylistManagerStore.getState().syncWithCloud();
            } catch {
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
                set({ user: null, token: null, isAuthenticated: false });
            }
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

    // Login via QR Code Token
    loginViaToken: async (token) => {
        set({ loading: true });
        try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const { data } = await api.get('/auth/me');
            localStorage.setItem('token', token);
            set({ user: data.user, token, isAuthenticated: true, loading: false });
            usePlaylistManagerStore.getState().syncWithCloud();
            return { success: true };
        } catch (error) {
            set({ loading: false });
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            return { success: false, message: 'Token de pareamento inválido ou expirado.' };
        }
    },

    // Check if user is admin
    isAdmin: () => get().user?.role === 'admin'
}));
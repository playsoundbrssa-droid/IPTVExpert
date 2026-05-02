import { create } from 'zustand';
import api from '../services/api';

export const useEpgStore = create((set, get) => ({
    nowPlaying: {}, // { channelId: { title, start, stop, desc } }
    loading: false,
    lastFetched: null,

    fetchNowPlaying: async (cacheKey) => {
        if (!cacheKey) return;
        
        // Evita chamadas excessivas (mínimo 5 minutos entre atualizações de bulk)
        const now = Date.now();
        const { lastFetched } = get();
        if (lastFetched && now - lastFetched < 5 * 60 * 1000) return;

        set({ loading: true });
        try {
            const { data } = await api.get('/epg/now-playing', { params: { cacheKey } });
            set({ nowPlaying: data || {}, lastFetched: now });
        } catch (error) {
            console.error('[EPG] Erro ao buscar Now Playing:', error);
        } finally {
            set({ loading: false });
        }
    },

    getProgramForChannel: (channelId) => {
        return get().nowPlaying[channelId] || null;
    }
}));

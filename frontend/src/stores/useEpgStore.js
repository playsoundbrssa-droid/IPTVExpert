import { create } from 'zustand';
import api from '../services/api';

export const useEpgStore = create((set, get) => ({
    nowPlaying: {},
    loading: false,
    lastFetched: null,

    fetchNowPlaying: async (cacheKey) => {
        if (!cacheKey) return;
        
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

    // Busca EPG para canais Xtream via short_epg (sem baixar XMLTV)
    fetchXtreamNowPlaying: async (server, username, password, streamIds) => {
        const now = Date.now();
        const { lastFetched } = get();
        if (lastFetched && now - lastFetched < 5 * 60 * 1000) return null;

        if (!streamIds || streamIds.length === 0) return null;

        set({ loading: true });
        try {
            // Buscar apenas os primeiros 30 canais para não sobrecarregar
            const ids = streamIds.slice(0, 30).join(',');
            const { data } = await api.get('/epg/xtream', {
                params: { server, username, password, streamIds: ids },
                timeout: 30000
            });
            
            if (data?.data && Object.keys(data.data).length > 0) {
                const nowDate = new Date();
                const nowPlaying = {};
                
                Object.keys(data.data).forEach(channelId => {
                    const programs = data.data[channelId];
                    if (!Array.isArray(programs)) return;
                    const current = programs.find(p => {
                        let start, stop;
                        if (p.start_timestamp) {
                            start = new Date(parseInt(p.start_timestamp) * 1000);
                            stop = new Date(parseInt(p.stop_timestamp) * 1000);
                        } else {
                            // Fallback to date strings
                            start = new Date(p.start);
                            stop = new Date(p.stop);
                        }
                        return start && stop && !isNaN(start) && !isNaN(stop) && nowDate >= start && nowDate <= stop;
                    });
                    if (current) {
                        nowPlaying[channelId] = { current };
                    }
                });

                set({ nowPlaying, lastFetched: now });
                return true;
            }
        } catch (error) {
            console.error('[EPG XTREAM] Erro:', error.message);
        } finally {
            set({ loading: false });
        }
        return null;
    },

    getProgramForChannel: (channelId) => {
        return get().nowPlaying[channelId] || null;
    }
}));

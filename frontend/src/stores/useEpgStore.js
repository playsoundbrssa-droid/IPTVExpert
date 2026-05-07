import { create } from 'zustand';
import api from '../services/api';

export const useEpgStore = create((set, get) => ({
    nowPlaying: {}, // { channelId: { current: { title, start, stop, desc } } }
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

    // Busca EPG Xtream e popula nowPlaying diretamente (sem depender de cacheKey)
    fetchXtreamNowPlaying: async (server, username, password) => {
        const now = Date.now();
        const { lastFetched } = get();
        if (lastFetched && now - lastFetched < 5 * 60 * 1000) return;

        set({ loading: true });
        try {
            const { data } = await api.get('/epg/xtream', {
                params: { server, username, password },
                timeout: 180000
            });
            
            if (data?.data && Object.keys(data.data).length > 0) {
                // Converter dados brutos em formato nowPlaying
                const nowDate = new Date();
                const nowPlaying = {};
                
                const parseDate = (d) => {
                    if (!d) return null;
                    const clean = d.split(' ')[0];
                    const y = clean.substring(0, 4), m = clean.substring(4, 6);
                    const day = clean.substring(6, 8), h = clean.substring(8, 10);
                    const min = clean.substring(10, 12);
                    return new Date(`${y}-${m}-${day}T${h}:${min}:00`);
                };

                Object.keys(data.data).forEach(channelId => {
                    const programs = data.data[channelId];
                    if (!Array.isArray(programs)) return;
                    const current = programs.find(p => {
                        const start = parseDate(p.start);
                        const stop = parseDate(p.stop);
                        return start && stop && nowDate >= start && nowDate <= stop;
                    });
                    if (current) {
                        nowPlaying[channelId] = { current };
                    }
                });

                set({ nowPlaying, lastFetched: now });
                console.log(`[EPG XTREAM] NowPlaying populado: ${Object.keys(nowPlaying).length} canais`);
                
                return data.cacheKey; // Retorna o cacheKey para salvar na playlist
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

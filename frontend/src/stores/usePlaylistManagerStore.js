import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// O manager salva apenas CONFIGURAÇÕES LEVES para re-importar depois
// Nunca salva os dados completos da lista (que podem ser 50MB+)
export const usePlaylistManagerStore = create(
    persist(
        (set, get) => ({
            playlists: [],          // Array de { id, name, type, total, createdAt, config }
            activePlaylistId: null,

            savePlaylist: (name, type, total, config, stats = {}) => {
                const id = `playlist_${Date.now()}`;
                const entry = {
                    id,
                    name,
                    type,        // 'm3u', 'xtream', 'file', 'hls'
                    total,       // número de itens (leve)
                    channelsCount: stats.channelsCount || 0,
                    moviesCount:   stats.moviesCount || 0,
                    seriesCount:   stats.seriesCount || 0,
                    createdAt: new Date().toISOString(),
                    config       // { url } para m3u/hls, { server, username, password } para xtream
                };
                set((state) => ({
                    playlists: [...state.playlists, entry],
                    activePlaylistId: id
                }));
                return entry;
            },

            updatePlaylistStats: (id, stats) => {
                set((state) => ({
                    playlists: state.playlists.map(p => 
                        p.id === id ? { 
                            ...p, 
                            total: stats.total || p.total,
                            channelsCount: stats.channelsCount ?? p.channelsCount,
                            moviesCount:   stats.moviesCount ?? p.moviesCount,
                            seriesCount:   stats.seriesCount ?? p.seriesCount,
                            epgUrl:        stats.epgUrl ?? p.epgUrl,
                            epgCacheKey:   stats.epgCacheKey ?? p.epgCacheKey
                        } : p
                    )
                }));
            },

            removePlaylist: (id) => {
                set((state) => {
                    const remaining = state.playlists.filter(p => p.id !== id);
                    return {
                        playlists: remaining,
                        activePlaylistId: state.activePlaylistId === id
                            ? (remaining[0]?.id || null)
                            : state.activePlaylistId
                    };
                });
            },

            setActivePlaylist: (id) => set({ activePlaylistId: id }),

            getActivePlaylist: () => {
                const { playlists, activePlaylistId } = get();
                return playlists.find(p => p.id === activePlaylistId) || null;
            },

            renamePlaylist: (id, newName) => {
                set((state) => ({
                    playlists: state.playlists.map(p =>
                        p.id === id ? { ...p, name: newName } : p
                    )
                }));
            }
        }),
        { name: 'iptv-playlist-manager' }
    )
);

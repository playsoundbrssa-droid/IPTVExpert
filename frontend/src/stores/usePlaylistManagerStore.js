import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

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

                // Async Sync to Cloud
                api.post('/user/playlists', entry).catch(err => console.error('[SYNC] Error saving:', err));

                return entry;
            },

            updatePlaylistStats: (id, stats) => {
                set((state) => {
                    const newPlaylists = state.playlists.map(p => 
                        p.id === id ? { 
                            ...p, 
                            total: stats.total || p.total,
                            channelsCount: stats.channelsCount ?? p.channelsCount,
                            moviesCount:   stats.moviesCount ?? p.moviesCount,
                            seriesCount:   stats.seriesCount ?? p.seriesCount,
                            epgUrl:        stats.epgUrl ?? p.epgUrl,
                            epgCacheKey:   stats.epgCacheKey ?? p.epgCacheKey
                        } : p
                    );
                    
                    // Sync updated entry to cloud
                    const updatedEntry = newPlaylists.find(p => p.id === id);
                    if (updatedEntry) {
                        api.post('/user/playlists', updatedEntry).catch(e => console.error('[SYNC] Error updating:', e));
                    }
                    
                    return { playlists: newPlaylists };
                });
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
                // Sync to cloud
                api.delete(`/user/playlists/${id}`).catch(err => console.error('[SYNC] Error deleting:', err));
            },

            setActivePlaylist: (id) => set({ activePlaylistId: id }),

            getActivePlaylist: () => {
                const { playlists, activePlaylistId } = get();
                return playlists.find(p => p.id === activePlaylistId) || null;
            },

            renamePlaylist: (id, newName) => {
                set((state) => {
                    const newPlaylists = state.playlists.map(p =>
                        p.id === id ? { ...p, name: newName } : p
                    );
                    
                    const updatedEntry = newPlaylists.find(p => p.id === id);
                    if (updatedEntry) {
                        api.post('/user/playlists', updatedEntry).catch(e => console.error('[SYNC] Error renaming:', e));
                    }
                    
                    return { playlists: newPlaylists };
                });
            },

            // Load playlists from cloud and override local
            syncWithCloud: async () => {
                try {
                    const { data } = await api.get('/user/playlists');
                    if (data && data.playlists) {
                        set((state) => {
                            const newPlaylists = data.playlists;
                            let newActiveId = state.activePlaylistId;
                            
                            // Adjust active ID if we have items
                            if (newPlaylists.length > 0 && !newPlaylists.some(p => p.id === newActiveId)) {
                                newActiveId = newPlaylists[0].id;
                            } else if (newPlaylists.length === 0) {
                                newActiveId = null;
                            }
                            
                            return {
                                playlists: newPlaylists,
                                activePlaylistId: newActiveId
                            };
                        });
                        console.log('[SYNC] Playlists sincronizadas com a nuvem.');
                    }
                } catch (error) {
                    console.error('[SYNC] Erro ao sincronizar a nuvem:', error);
                }
            },
            
            // Wipe local lists when logging out
            clearLocalPlaylists: () => {
                set({ playlists: [], activePlaylistId: null });
            }
        }),
        { name: 'iptv-playlist-manager' }
    )
);

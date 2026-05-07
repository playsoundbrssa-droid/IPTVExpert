import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { usePlaylistStore } from './usePlaylistStore';
import toast from 'react-hot-toast';

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
                api.post('/user-playlists', entry).catch(err => console.error('[SYNC] Error saving:', err));

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
                        api.post('/user-playlists', updatedEntry).catch(e => console.error('[SYNC] Error updating:', e));
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
                api.delete(`/user-playlists/${id}`).catch(err => console.error('[SYNC] Error deleting:', err));
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
                        api.post('/user-playlists', updatedEntry).catch(e => console.error('[SYNC] Error renaming:', e));
                    }
                    
                    return { playlists: newPlaylists };
                });
            },

            // Load playlists from cloud and merge with local
            syncWithCloud: async (preferredId = null) => {
                try {
                    const { data } = await api.get('/user-playlists');
                    if (data && data.playlists) {
                        set((state) => {
                            const cloudPlaylists = data.playlists;
                            const localPlaylists = state.playlists;
                            
                            // Merge: manter locais que não estão na nuvem e atualizar as que estão
                            const mergedPlaylists = [...cloudPlaylists];
                            
                            // Upload local-only playlists to cloud
                            localPlaylists.forEach(local => {
                                if (!cloudPlaylists.some(cloud => cloud.id === local.id)) {
                                    mergedPlaylists.push(local);
                                    // Async upload to cloud
                                    api.post('/user-playlists', local).catch(err => console.log('[SYNC] Uploading local list to cloud:', local.name));
                                }
                            });
                            
                            let newActiveId = preferredId || state.activePlaylistId;
                            if (mergedPlaylists.length > 0 && !mergedPlaylists.some(p => p.id === newActiveId)) {
                                newActiveId = mergedPlaylists[0].id;
                            }
                            
                            const finalState = {
                                playlists: mergedPlaylists,
                                activePlaylistId: newActiveId
                            };
                            
                            set(finalState);

                            // Trigger refresh if we have an active playlist to load data
                            if (newActiveId) {
                                get().refreshActivePlaylist();
                            }

                            return finalState;
                        });
                        console.log('[SYNC] Playlists sincronizadas.');
                    }
                } catch (error) {
                    console.error('[SYNC] Erro ao sincronizar a nuvem:', error);
                }
            },
            
            // Re-import data for the active playlist
            refreshActivePlaylist: async () => {
                const active = get().getActivePlaylist();
                if (!active) return;

                const { setPlaylistData } = usePlaylistStore.getState();
                const tid = toast.loading(`Atualizando "${active.name}"...`);

                try {
                    let data;
                    if (active.type === 'xtream') {
                        const { server, username, password } = active.config;
                        const res = await api.post('/xtream/import', { server, username, password });
                        data = res.data;
                    } else if (active.type === 'm3u') {
                        const res = await api.post('/playlist/import-m3u', { url: active.config.url });
                        data = res.data;
                    } else if (active.type === 'hls') {
                        toast.success('Link HLS é estático, não há o que atualizar.');
                        toast.dismiss(tid);
                        return;
                    }

                    if (data) {
                        setPlaylistData(data);
                        get().updatePlaylistStats(active.id, {
                            total: data.total,
                            channelsCount: data.channels?.list?.length || 0,
                            moviesCount: data.movies?.list?.length || 0,
                            seriesCount: data.series?.list?.length || 0
                        });
                        toast.success(`✅ "${active.name}" atualizada!`);
                    }
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Erro ao atualizar playlist.');
                } finally {
                    toast.dismiss(tid);
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

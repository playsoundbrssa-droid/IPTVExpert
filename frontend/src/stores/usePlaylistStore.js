import { create } from 'zustand';

// ── IndexedDB helper (nativo do browser, sem dependências) ────────────────────
// O IndexedDB não tem limite fixo — usa até centenas de MB dependendo do disco
const IDB_STORE = 'iptv-playlist-data';
const IDB_DB    = 'iptv-expert-db';
const IDB_VER   = 1;

const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, IDB_VER);
    req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
        }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
});

const idbGet = async (key) => {
    try {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx   = db.transaction(IDB_STORE, 'readonly');
            const req  = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror   = (e) => reject(e.target.error);
        });
    } catch { return null; }
};

const idbSet = async (key, value) => {
    try {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx   = db.transaction(IDB_STORE, 'readwrite');
            const req  = tx.objectStore(IDB_STORE).put(value, key);
            req.onsuccess = () => resolve();
            req.onerror   = (e) => reject(e.target.error);
        });
    } catch (e) {
        console.error('[IDB] Falha ao salvar:', e);
    }
};

const idbDel = async (key) => {
    try {
        const db = await openDb();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
    } catch { /* ignora */ }
};
// ─────────────────────────────────────────────────────────────────────────────

export const usePlaylistStore = create((set, get) => ({
    channelsList:   [],
    channelsGroups: {},
    moviesList:     [],
    moviesGroups:   {},
    seriesList:     [],
    seriesGroups:   {},
    isLoaded:       false,
    selectedLiveGroup:   localStorage.getItem('selectedLiveGroup'),
    selectedMovieGroup:  localStorage.getItem('selectedMovieGroup'),
    selectedSeriesGroup: localStorage.getItem('selectedSeriesGroup'),
    selectedMediaDetails: null,

    setSelectedLiveGroup:   (group) => {
        localStorage.setItem('selectedLiveGroup', group || '');
        set({ selectedLiveGroup: group });
    },
    setSelectedMovieGroup:  (group) => {
        localStorage.setItem('selectedMovieGroup', group || '');
        set({ selectedMovieGroup: group });
    },
    setSelectedSeriesGroup: (group) => {
        localStorage.setItem('selectedSeriesGroup', group || '');
        set({ selectedSeriesGroup: group });
    },
    setSelectedMediaDetails: (item) => set({ selectedMediaDetails: item }),

    // Carrega do IndexedDB ao abrir o app (chamado no main.jsx ou App.jsx)
    loadFromStorage: async () => {
        try {
            const saved = await idbGet('currentPlaylist');
            if (saved) {
                set({
                    channelsList:   saved.channels?.list   || [],
                    channelsGroups: saved.channels?.groups || {},
                    moviesList:     saved.movies?.list     || [],
                    moviesGroups:   saved.movies?.groups   || {},
                    seriesList:     saved.series?.list     || [],
                    seriesGroups:   saved.series?.groups   || {},
                    isLoaded: true
                });
                console.log(`[IDB] Playlist carregada: ${(saved.channels?.list?.length || 0) + (saved.movies?.list?.length || 0) + (saved.series?.list?.length || 0)} itens`);
            } else {
                set({ isLoaded: true });
            }
        } catch (e) {
            console.error('[IDB] Erro ao carregar playlist:', e);
            set({ isLoaded: true });
        }
    },

    setPlaylistData: (data) => {
        set({
            channelsList:   data.channels?.list   || [],
            channelsGroups: data.channels?.groups || {},
            moviesList:     data.movies?.list     || [],
            moviesGroups:   data.movies?.groups   || {},
            seriesList:     data.series?.list     || [],
            seriesGroups:   data.series?.groups   || {}
        });
        // Salva no IndexedDB em background (sem bloquear a UI)
        idbSet('currentPlaylist', data).then(() => {
            const total = (data.channels?.list?.length || 0) + (data.movies?.list?.length || 0) + (data.series?.list?.length || 0);
            console.log(`[IDB] ✅ Playlist salva: ${total} itens`);
        });
    },

    clearPlaylist: () => {
        set({
            channelsList: [], channelsGroups: {},
            moviesList: [],   moviesGroups: {},
            seriesList: [],   seriesGroups: {}
        });
        idbDel('currentPlaylist');
    },

    favorites: (() => {
        try {
            return JSON.parse(localStorage.getItem('iptv_favorites') || '[]');
        } catch {
            return [];
        }
    })(),

    addFavorite: (item) => set((state) => {
        // Evita duplicatas por ID
        if (state.favorites.some(f => f.id === item.id)) return state;
        const newFavorites = [...state.favorites, item];
        localStorage.setItem('iptv_favorites', JSON.stringify(newFavorites));
        return { favorites: newFavorites };
    }),

    removeFavorite: (id) => set((state) => {
        const newFavorites = state.favorites.filter(f => f.id !== id);
        localStorage.setItem('iptv_favorites', JSON.stringify(newFavorites));
        return { favorites: newFavorites };
    })
});
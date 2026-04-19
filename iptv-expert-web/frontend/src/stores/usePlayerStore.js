import { create } from 'zustand';

export const usePlayerStore = create((set, get) => ({
    currentStream: null,
    playlist: [],
    isPlaying: false,
    
    setCurrentStream: (stream, playlist = []) => {
        set({ 
            currentStream: stream, 
            playlist: playlist.length > 0 ? playlist : get().playlist,
            isPlaying: !!stream 
        });
    },

    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    playNext: () => {
        const { currentStream, playlist } = get();
        if (!currentStream || playlist.length === 0) return;

        const currentIndex = playlist.findIndex(item => item.id === currentStream.id);
        if (currentIndex === -1) return;

        const nextIndex = (currentIndex + 1) % playlist.length;
        set({ currentStream: playlist[nextIndex], isPlaying: true });
    },

    playPrev: () => {
        const { currentStream, playlist } = get();
        if (!currentStream || playlist.length === 0) return;

        const currentIndex = playlist.findIndex(item => item.id === currentStream.id);
        if (currentIndex === -1) return;

        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        set({ currentStream: playlist[prevIndex], isPlaying: true });
    }
}));
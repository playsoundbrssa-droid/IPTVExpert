import { create } from 'zustand';
import { api } from '../services/api';

export const useProgressStore = create((set, get) => ({
    progressMap: {}, // { mediaId: { currentTime, duration, updatedAt } }
    loading: false,

    // Fetch progress for all media in a playlist
    fetchAllProgress: async (playlistId) => {
        if (!playlistId) return;
        try {
            const { data } = await api.get(`/progress/all?playlistId=${playlistId}`);
            const map = {};
            data.progress.forEach(p => {
                map[p.media_id] = {
                    currentTime: p.current_time,
                    duration: p.duration
                };
            });
            set({ progressMap: map });
        } catch (error) {
            console.error('[PROGRESS] Error fetching all:', error);
        }
    },

    // Save progress to backend (throttled)
    saveProgress: async (playlistId, mediaId, currentTime, duration) => {
        if (!playlistId || !mediaId) return;
        
        // Update local state immediately for UI responsiveness
        set((state) => ({
            progressMap: {
                ...state.progressMap,
                [mediaId]: { currentTime, duration, updatedAt: new Date().toISOString() }
            }
        }));

        try {
            await api.post('/progress', {
                playlistId,
                mediaId,
                currentTime,
                duration
            });
        } catch (error) {
            console.error('[PROGRESS] Error saving:', error);
        }
    },

    // Get progress for a specific media
    getProgress: (mediaId) => {
        return get().progressMap[mediaId] || null;
    }
}));

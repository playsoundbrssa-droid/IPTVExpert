import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const statsApi = {
    incrementView: async (item) => {
        try {
            await axios.post(`${API_URL}/stats/view`, item);
        } catch (error) {
            console.error('[STATS API ERROR]', error.message);
        }
    },

    getHighlights: async () => {
        try {
            const response = await axios.get(`${API_URL}/stats/highlights`);
            return response.data;
        } catch (error) {
            console.error('[STATS API ERROR]', error.message);
            return { channels: [], movies: [], series: [] };
        }
    }
};

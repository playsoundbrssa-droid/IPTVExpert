import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
console.log('[API] Usando Base URL:', baseURL);

export const api = axios.create({
    baseURL
});

// Request interceptor for Auth Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for Debugging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.data) {
            console.error('[API ERROR DETAILS]', error.response.data);
        }
        return Promise.reject(error);
    }
);

export const getProxyUrl = (url, isFetch = false) => {
    if (!url) return '';
    const endpoint = isFetch ? 'proxy/fetch' : 'proxy/stream';
    return `${baseURL}/${endpoint}?url=${encodeURIComponent(url)}`;
};

export default api;
const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '6f926673a3ad4681602052402120e24c'; // Chave de teste pública comum
const BASE_URL = 'https://api.themoviedb.org/3';

exports.searchMedia = async (title, type = 'movie') => {
    try {
        const searchPath = type === 'series' ? 'tv' : 'movie';
        const response = await axios.get(`${BASE_URL}/search/${searchPath}`, {
            params: {
                api_key: TMDB_API_KEY,
                query: title,
                language: 'pt-BR'
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const media = response.data.results[0];
            
            // Buscar detalhes completos para pegar o backdrop e mais infos
            const detailResponse = await axios.get(`${BASE_URL}/${searchPath}/${media.id}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: 'pt-BR'
                }
            });

            const data = detailResponse.data;
            return {
                id: data.id,
                title: data.title || data.name,
                overview: data.overview,
                posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
                backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
                voteAverage: data.vote_average,
                releaseDate: data.release_date || data.first_air_date,
                genres: data.genres?.map(g => g.name) || [],
                tagline: data.tagline
            };
        }
        return null;
    } catch (error) {
        console.error('[TMDB ERROR]', error.message);
        return null;
    }
};

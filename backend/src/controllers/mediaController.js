const tmdbService = require('../services/tmdbService');
const xtreamApiService = require('../services/xtreamApiService');

exports.getMediaMetadata = async (req, res) => {
    try {
        const { title, type } = req.query;
        if (!title) {
            return res.status(400).json({ message: 'Título é obrigatório.' });
        }

        const metadata = await tmdbService.searchMedia(title, type);
        
        // Retornamos 200 mesmo se não encontrar para evitar que o Axios trate como "ERRO de sistema"
        return res.status(200).json(metadata || null);
    } catch (error) {
        console.error('[MEDIA CONTROLLER ERROR]', error.message);
        res.status(500).json({ message: 'Erro ao buscar metadados.' });
    }
};

exports.getSeriesEpisodes = async (req, res) => {
    try {
        const { server, username, password, series_id } = req.query;
        
        if (!server || !username || !password || !series_id) {
            return res.status(400).json({ message: 'Credenciais e ID da série são obrigatórios.' });
        }

        const info = await xtreamApiService.getSeriesInfo(server, username, password, series_id);
        
        // Xtream retorna episódios dentro de info.episodes que é um objeto onde as chaves são as temporadas
        // Precisamos normalizar isso para o frontend
        const episodes = [];
        if (info && info.episodes) {
            Object.keys(info.episodes).forEach(seasonNum => {
                const seasonEpisodes = info.episodes[seasonNum];
                seasonEpisodes.forEach(ep => {
                    episodes.push({
                        id: `xtream_ep_${ep.id}`,
                        name: ep.title || `Episódio ${ep.episode_num}`,
                        streamUrl: `${server.replace(/\/$/, '')}/series/${username}/${password}/${ep.id}.${ep.container_extension || 'mp4'}`,
                        season: parseInt(seasonNum),
                        episode: parseInt(ep.episode_num),
                        logo: ep.info?.movie_image || null,
                        type: 'series'
                    });
                });
            });
        }

        res.json(episodes);
    } catch (error) {
        console.error('[GET EPISODES ERROR]', error.message);
        res.status(500).json({ message: 'Erro ao buscar episódios da série.' });
    }
};

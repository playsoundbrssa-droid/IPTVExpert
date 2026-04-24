const tmdbService = require('../services/tmdbService');
const xtreamApiService = require('../services/xtreamApiService');
const db = require('../config/database');

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
        const { seriesId, playlistId } = req.query;
        const userId = req.user.id;

        if (!seriesId || !playlistId) {
            return res.status(400).json({ message: 'ID da série e da playlist são obrigatórios.' });
        }

        // Busca a playlist no banco de forma robusta
        let result;
        if (db.isPostgres) {
            result = await db.query('SELECT config FROM user_playlists WHERE client_id = $1 AND user_id = $2', [playlistId, userId]);
        } else {
            result = await db.query('SELECT config FROM user_playlists WHERE client_id = ? AND user_id = ?', [playlistId, userId]);
        }
        
        const rows = result.rows || result;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Playlist não encontrada.' });
        }

        const config = typeof rows[0].config === 'string' ? JSON.parse(rows[0].config) : rows[0].config;
        
        if (config && config.serverUrl && config.username) {
            // Extrai apenas o número do ID (ex: xtream_series_8159 -> 8159)
            const rawId = seriesId.split('_').pop();
            
            const info = await xtreamApiService.getSeriesInfo(
                config.serverUrl, 
                config.username, 
                config.password, 
                rawId
            );

            const episodes = [];
            if (info && info.episodes) {
                Object.keys(info.episodes).forEach(seasonNum => {
                    info.episodes[seasonNum].forEach(ep => {
                        const streamId = ep.id || ep.stream_id;
                        const ext = ep.container_extension || 'mp4';
                        
                        // Garante que o nome do episódio seja amigável
                        let epName = ep.title || `Episódio ${ep.episode_num}`;
                        if (epName.toLowerCase() === info.info?.name?.toLowerCase()) {
                            epName = `Episódio ${ep.episode_num}`;
                        }

                        episodes.push({
                            id: `xtream_ep_${streamId}`,
                            name: epName,
                            season: parseInt(seasonNum),
                            episode: parseInt(ep.episode_num),
                            order: parseInt(ep.episode_num),
                            streamUrl: `${config.serverUrl}/series/${config.username}/${config.password}/${streamId}.${ext}`,
                            logo: ep.info?.movie_image || info.info?.cover || null,
                            type: 'series'
                        });
                    });
                });
                return res.json({ episodes });
            }
        }

        res.json({ episodes: [] });
    } catch (error) {
        console.error('[GET EPISODES ERROR]', error);
        res.status(500).json({ message: 'Erro ao processar episódios.', detail: error.message });
    }
};

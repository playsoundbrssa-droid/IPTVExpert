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

        const formatQuery = (text) => db.isPostgres ? text.replace(/\?/g, (val, i) => `$${i+1}`) : text;
        const sql = formatQuery('SELECT config FROM user_playlists WHERE client_id = ? AND user_id = ?');
        const result = await db.query(sql, [playlistId, userId]);
        
        const rows = result.rows || result;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Playlist não encontrada' });
        }

        const config = JSON.parse(rows[0].config);
        
        // Se for Xtream API
        if (config.serverUrl && config.username) {
            // Limpeza robusta do ID para pegar apenas o número (ex: 8159)
            const rawId = seriesId.replace('series_group_', '').replace('xtream_series_', '');
            
            console.log(`[XTREAM EPISODES] Buscando info para ID: ${rawId} na playlist ${playlistId}`);
            
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
                        const streamId = ep.id || ep.stream_id || ep.id;
                        const ext = ep.container_extension || 'mp4';
                        episodes.push({
                            id: `xtream_ep_${streamId}`,
                            name: ep.title || `Episódio ${ep.episode_num}`,
                            season: parseInt(seasonNum),
                            episode: parseInt(ep.episode_num),
                            order: parseInt(ep.episode_num),
                            streamUrl: `${config.serverUrl}/series/${config.username}/${config.password}/${streamId}.${ext}`,
                            logo: ep.info?.movie_image || null,
                            type: 'series'
                        });
                    });
                });
            }

            return res.json({ episodes });
        }

        res.json({ episodes: [] });
    } catch (error) {
        console.error('[GET EPISODES ERROR]', error.message);
        res.status(500).json({ message: 'Erro ao buscar episódios da série.' });
    }
};

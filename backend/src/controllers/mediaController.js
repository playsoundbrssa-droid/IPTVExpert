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

        console.log(`[DEBUG EPISODES] Solicitado: Series=${seriesId}, Playlist=${playlistId}, User=${userId}`);

        if (!seriesId || !playlistId) {
            return res.status(400).json({ message: 'ID da série e da playlist são obrigatórios.' });
        }

        const formatQuery = (text) => db.isPostgres ? text.replace(/\?/g, (val, i) => `$${i+1}`) : text;
        const sql = formatQuery('SELECT config FROM user_playlists WHERE client_id = ? AND user_id = ?');
        
        console.log(`[DEBUG EPISODES] Executando SQL no banco...`);
        const result = await db.query(sql, [playlistId, userId]);
        
        const rows = result.rows || result;
        if (!rows || rows.length === 0) {
            console.error(`[DEBUG EPISODES] Playlist ${playlistId} não encontrada no banco.`);
            return res.status(404).json({ message: 'Playlist não encontrada no seu perfil.' });
        }

        console.log(`[DEBUG EPISODES] Playlist encontrada. Lendo config...`);
        let config;
        try {
            config = typeof rows[0].config === 'string' ? JSON.parse(rows[0].config) : rows[0].config;
        } catch (e) {
            console.error(`[DEBUG EPISODES] Erro ao parsear config:`, rows[0].config);
            return res.status(500).json({ message: 'Configuração da playlist corrompida.' });
        }
        
        // Se for Xtream API
        if (config && config.serverUrl && config.username) {
            const rawId = seriesId.replace('series_group_', '').replace('xtream_series_', '');
            
            console.log(`[DEBUG EPISODES] Chamando Xtream API para ID: ${rawId} em ${config.serverUrl}`);
            
            try {
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
                    console.log(`[DEBUG EPISODES] ✅ Sucesso! Encontrados ${episodes.length} episódios.`);
                    return res.json({ episodes });
                } else {
                    console.warn(`[DEBUG EPISODES] Xtream retornou dados sem episódios.`);
                    return res.json({ episodes: [] });
                }
            } catch (xtreamErr) {
                console.error(`[DEBUG EPISODES] Erro na chamada Xtream:`, xtreamErr.message);
                return res.status(500).json({ message: 'Erro ao conectar com o servidor de IPTV.', detail: xtreamErr.message });
            }
        }

        console.warn(`[DEBUG EPISODES] Playlist não é Xtream ou faltam credenciais.`);
        res.json({ episodes: [] });
    } catch (error) {
        console.error('[DEBUG EPISODES FATAL ERROR]', error);
        res.status(500).json({ message: 'Erro interno ao processar episódios.', detail: error.message });
    }
};

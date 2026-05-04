const db = require('../config/database');

// Formatter like in User.js
const formatQuery = (text) => {
    if (!db.isPostgres) return text;
    let index = 1;
    return text.replace(/\?/g, () => `$${index++}`);
};

const userPlaylistController = {
    // Buscar todas playlists do usuário
    getPlaylists: async (req, res) => {
        try {
            const userId = req.userId; // Corrigido: middleware define req.userId, não req.user.id
            const sql = formatQuery('SELECT * FROM user_playlists WHERE user_id = ? ORDER BY createdAt ASC');
            const result = await db.query(sql, [userId]);
            
            const playlists = (result.rows || result).map(p => ({
                id: p.client_id,
                name: p.name,
                type: p.type,
                total: p.total,
                channelsCount: p.channelsCount || p.channelscount || 0,
                moviesCount: p.moviesCount || p.moviescount || 0,
                seriesCount: p.seriesCount || p.seriescount || 0,
                config: JSON.parse(p.config),
                createdAt: p.createdat || p.createdAt
            }));

            res.json({ playlists });
        } catch (error) {
            console.error('[UserPlaylist] Erro ao buscar:', error);
            res.status(500).json({ message: 'Erro ao buscar playlists.' });
        }
    },

    // Salvar ou atualizar playlist
    savePlaylist: async (req, res) => {
        try {
            const userId = req.userId; // Corrigido
            const { id, name, type, total, config, channelsCount, moviesCount, seriesCount } = req.body;
            
            if (!id || !name || !type || !config) {
                return res.status(400).json({ message: 'Dados incompletos da playlist.' });
            }

            // UPSERT-like behavior
            const checkSql = formatQuery('SELECT id FROM user_playlists WHERE client_id = ? AND user_id = ?');
            const checkRes = await db.query(checkSql, [id, userId]);
            
            const configStr = JSON.stringify(config);
            const totalVal = total || 0;
            
            if (checkRes.rows?.length > 0 || (checkRes.length > 0)) {
                // Update
                const updateSql = formatQuery(`
                    UPDATE user_playlists 
                    SET name = ?, type = ?, total = ?, config = ?, channelsCount = ?, moviesCount = ?, seriesCount = ?
                    WHERE client_id = ? AND user_id = ?
                `);
                await db.query(updateSql, [name, type, totalVal, configStr, channelsCount || 0, moviesCount || 0, seriesCount || 0, id, userId]);
            } else {
                // Insert
                const insertSql = formatQuery(`
                    INSERT INTO user_playlists (user_id, client_id, name, type, total, config, channelsCount, moviesCount, seriesCount) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                await db.query(insertSql, [userId, id, name, type, totalVal, configStr, channelsCount || 0, moviesCount || 0, seriesCount || 0]);
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('[UserPlaylist] Erro ao salvar:', error);
            res.status(500).json({ message: 'Erro ao salvar playlist.', details: error.message });
        }
    },

    // Deletar playlist
    deletePlaylist: async (req, res) => {
        try {
            const userId = req.userId; // Corrigido
            const clientId = req.params.id;
            
            const delSql = formatQuery('DELETE FROM user_playlists WHERE client_id = ? AND user_id = ?');
            await db.query(delSql, [clientId, userId]);
            
            res.json({ success: true });
        } catch (error) {
            console.error('[UserPlaylist] Erro ao deletar:', error);
            res.status(500).json({ message: 'Erro ao remover playlist.' });
        }
    }
};

module.exports = userPlaylistController;

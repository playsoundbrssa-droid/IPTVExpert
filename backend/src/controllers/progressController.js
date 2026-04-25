const db = require('../config/database');

const formatQuery = (text) => {
    if (!db.isPostgres) return text;
    let index = 1;
    return text.replace(/\?/g, () => `$${index++}`);
};

const progressController = {
    // Save progress
    saveProgress: async (req, res) => {
        try {
            const userId = req.userId;
            const { mediaId, playlistId, currentTime, duration } = req.body;

            if (!mediaId || !playlistId || currentTime === undefined) {
                return res.status(400).json({ message: 'Dados incompletos.' });
            }

            // Upsert progress
            const sql = formatQuery(`
                INSERT INTO user_media_progress (user_id, media_id, playlist_id, last_position, duration, updatedAt)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, media_id, playlist_id)
                DO UPDATE SET last_position = EXCLUDED.last_position, duration = EXCLUDED.duration, updatedAt = CURRENT_TIMESTAMP
            `);

            // Fallback for SQLite which uses a different UPSERT syntax or we can just delete/insert
            if (!db.isPostgres) {
                // For SQLite: DELETE then INSERT
                const delSql = formatQuery('DELETE FROM user_media_progress WHERE user_id = ? AND media_id = ? AND playlist_id = ?');
                await db.query(delSql, [userId, mediaId, playlistId]);
                
                const insSql = formatQuery('INSERT INTO user_media_progress (user_id, media_id, playlist_id, last_position, duration) VALUES (?, ?, ?, ?, ?)');
                await db.query(insSql, [userId, mediaId, playlistId, currentTime, duration]);
            } else {
                await db.query(sql, [userId, mediaId, playlistId, currentTime, duration]);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('[PROGRESS] Erro ao salvar:', error);
            res.status(500).json({ message: 'Erro ao salvar progresso.' });
        }
    },

    // Get progress for a specific media
    getProgress: async (req, res) => {
        try {
            const userId = req.userId;
            const { mediaId, playlistId } = req.query;

            const sql = formatQuery('SELECT last_position, duration, updatedAt FROM user_media_progress WHERE user_id = ? AND media_id = ? AND playlist_id = ?');
            const result = await db.query(sql, [userId, mediaId, playlistId]);

            const progress = (result.rows || result)[0] || null;
            res.json({ progress });
        } catch (error) {
            console.error('[PROGRESS] Erro ao buscar:', error);
            res.status(500).json({ message: 'Erro ao buscar progresso.' });
        }
    },

    // Get all progress for a playlist (to show badges on cards)
    getAllProgress: async (req, res) => {
        try {
            const userId = req.userId;
            const { playlistId } = req.query;

            const sql = formatQuery('SELECT media_id, last_position, duration FROM user_media_progress WHERE user_id = ? AND playlist_id = ?');
            const result = await db.query(sql, [userId, playlistId]);

            const progressList = result.rows || result;
            res.json({ progress: progressList });
        } catch (error) {
            console.error('[PROGRESS] Erro ao buscar todos:', error);
            res.status(500).json({ message: 'Erro ao buscar lista de progresso.' });
        }
    }
};

module.exports = progressController;

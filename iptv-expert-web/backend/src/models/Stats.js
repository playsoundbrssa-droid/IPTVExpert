const db = require('../config/database');

// Helper para converter placeholders '?' para '$1, $2...' se for PostgreSQL
const formatQuery = (text) => {
    if (!db.isPostgres) return text;
    let index = 1;
    return text.replace(/\?/g, () => `$${index++}`);
};

const Stats = {
    incrementView: async (item) => {
        try {
            const { id, name, type, logo, group, streamUrl } = item;
            
            if (!id) return;

            const res = await db.query(formatQuery('SELECT id, views FROM media_stats WHERE media_id = ?'), [id]);
            const existing = res.rows[0];

            if (existing) {
                await db.query(formatQuery('UPDATE media_stats SET views = views + 1, updatedAt = CURRENT_TIMESTAMP WHERE media_id = ?'), [id]);
            } else {
                await db.query(formatQuery(`
                    INSERT INTO media_stats (media_id, name, type, logo, group_name, stream_url, views)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                `), [id, name, type, logo, group, streamUrl]);
            }
        } catch (error) {
            console.error('[DATABASE STATS ERROR]', error);
        }
    },

    getTop: async (limit = 10, type = null) => {
        let sql = 'SELECT * FROM media_stats';
        const params = [];

        if (type) {
            sql += ' WHERE type = ?';
            params.push(type);
        }

        sql += ' ORDER BY views DESC LIMIT ?';
        params.push(limit);

        const res = await db.query(formatQuery(sql), params);
        return res.rows;
    }
};

module.exports = Stats;

const db = require('../config/database');

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS media_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        logo TEXT,
        group_name TEXT,
        stream_url TEXT,
        views INTEGER DEFAULT 0,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const Stats = {
    incrementView: (item) => {
        try {
            const { id, name, type, logo, group, streamUrl } = item;
            
            if (!id) return;

            const existing = db.prepare('SELECT id, views FROM media_stats WHERE media_id = ?').get(id);

            if (existing) {
                db.prepare('UPDATE media_stats SET views = views + 1, updatedAt = CURRENT_TIMESTAMP WHERE media_id = ?')
                  .run(id);
            } else {
                db.prepare(`
                    INSERT INTO media_stats (media_id, name, type, logo, group_name, stream_url, views)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                `).run(id, name, type, logo, group, streamUrl);
            }
        } catch (error) {
            console.error('[DATABASE STATS ERROR]', error);
        }
    },

    getTop: (limit = 10, type = null) => {
        let query = 'SELECT * FROM media_stats';
        const params = [];

        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }

        query += ' ORDER BY views DESC LIMIT ?';
        params.push(limit);

        return db.prepare(query).all(...params);
    }
};

module.exports = Stats;

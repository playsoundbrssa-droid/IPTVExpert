const db = require('../config/database');

// Helper para converter placeholders '?' para '$1, $2...' se for PostgreSQL
const formatQuery = (text) => {
    if (!db.isPostgres) return text;
    let index = 1;
    return text.replace(/\?/g, () => `$${index++}`);
};

const User = {
    normalize: (user) => {
        if (!user) return null;
        const normalized = { ...user };
        // Normaliza campos para compatibilidade Postgres/SQLite
        if (user.isactive !== undefined) normalized.isActive = !!user.isactive;
        if (user.can_download !== undefined) {
            normalized.can_download = !!user.can_download;
            normalized.canDownload = !!user.can_download;
        }
        normalized.lastActivePlaylistId = user.last_active_playlist_id || user.lastactiveplaylistid;
        return normalized;
    },

    findOne: async (criteria) => {
        let sql = 'SELECT * FROM users WHERE ';
        const keys = Object.keys(criteria.where);
        const values = Object.values(criteria.where);
        
        sql += keys.map(k => `${k} = ?`).join(' AND ');
        
        const res = await db.query(formatQuery(sql), values);
        return User.normalize(res.rows[0]);
    },

    findByPk: async (id) => {
        const res = await db.query(formatQuery('SELECT * FROM users WHERE id = ?'), [id]);
        return User.normalize(res.rows[0]);
    },

    create: async (data) => {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(data);
        
        let sql = `INSERT INTO users (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        
        // No SQLite local não tem RETURNING *, então tratamos diferente
        if (!db.isPostgres) {
            sql = `INSERT INTO users (${keys.join(', ')}) VALUES (${placeholders})`;
            const res = await db.query(sql, values);
            return User.normalize({ id: res.lastInsertId, isActive: 1, ...data });
        }

        const res = await db.query(formatQuery(sql), values);
        return User.normalize(res.rows[0]);
    },

    update: async (data, criteria) => {
        const setKeys = Object.keys(data);
        const whereKeys = Object.keys(criteria.where);
        const values = [...Object.values(data), ...Object.values(criteria.where)];
        
        const setClause = setKeys.map(k => `${k} = ?`).join(', ');
        const whereClause = whereKeys.map(k => `${k} = ?`).join(' AND ');
        
        const sql = `UPDATE users SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE ${whereClause}`;
        return await db.query(formatQuery(sql), values);
    },

    findAll: async (options = {}) => {
        let sql = 'SELECT * FROM users';
        const params = [];

        if (options.where) {
            const keys = Object.keys(options.where);
            sql += ' WHERE ' + keys.map(k => `${k} = ?`).join(' AND ');
            params.push(...Object.values(options.where));
        }

        if (options.order) {
            sql += ' ORDER BY ' + options.order.map(o => `${o[0]} ${o[1]}`).join(', ');
        }

        const res = await db.query(formatQuery(sql), params);
        return (res.rows || res).map(row => User.normalize(row));
    },

    destroy: async (criteria) => {
        const keys = Object.keys(criteria.where);
        const values = Object.values(criteria.where);
        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        
        const sql = `DELETE FROM users WHERE ${whereClause}`;
        return await db.query(formatQuery(sql), values);
    }
};

module.exports = User;
const db = require('../config/database');

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT DEFAULT 'user',
        googleId TEXT UNIQUE,
        avatar TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const User = {
    findOne: (criteria) => {
        let query = 'SELECT * FROM users WHERE ';
        const keys = Object.keys(criteria.where);
        const values = Object.values(criteria.where);
        
        query += keys.map(k => `${k} = ?`).join(' AND ');
        
        const stmt = db.prepare(query);
        return stmt.get(...values);
    },

    findByPk: (id) => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    },

    create: (data) => {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(data);
        
        const stmt = db.prepare(`INSERT INTO users (${keys.join(', ')}) VALUES (${placeholders})`);
        const info = stmt.run(...values);
        
        return { id: info.lastInsertRowid, ...data };
    },

    update: async (data, criteria) => {
        const setKeys = Object.keys(data);
        const whereKeys = Object.keys(criteria.where);
        const values = [...Object.values(data), ...Object.values(criteria.where)];
        
        const setClause = setKeys.map(k => `${k} = ?`).join(', ');
        const whereClause = whereKeys.map(k => `${k} = ?`).join(' AND ');
        
        const stmt = db.prepare(`UPDATE users SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE ${whereClause}`);
        return stmt.run(...values);
    },

    findAll: (options = {}) => {
        let query = 'SELECT * FROM users';
        const params = [];

        if (options.where) {
            const keys = Object.keys(options.where);
            query += ' WHERE ' + keys.map(k => `${k} = ?`).join(' AND ');
            params.push(...Object.values(options.where));
        }

        if (options.order) {
            query += ' ORDER BY ' + options.order.map(o => `${o[0]} ${o[1]}`).join(', ');
        }

        const stmt = db.prepare(query);
        return stmt.all(...params);
    },

    destroy: (criteria) => {
        const keys = Object.keys(criteria.where);
        const values = Object.values(criteria.where);
        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        
        const stmt = db.prepare(`DELETE FROM users WHERE ${whereClause}`);
        return stmt.run(...values);
    }
};

module.exports = User;
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const isPostgres = !!process.env.DATABASE_URL;
let db;

if (isPostgres) {
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    db = new sqlite3.Database(path.join(dataDir, 'database.sqlite'));
}

const query = (text, params) => {
    if (isPostgres) return db.query(text, params);
    return new Promise((resolve, reject) => {
        db.all(text, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const initializeTables = async () => {
    const usersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            googleId TEXT,
            avatar TEXT,
            role TEXT DEFAULT 'user',
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const statsTable = `
        CREATE TABLE IF NOT EXISTS stats (
            id SERIAL PRIMARY KEY,
            media_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            views INTEGER DEFAULT 0,
            updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const playlistsTable = `
        CREATE TABLE IF NOT EXISTS user_playlists (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            client_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            total INTEGER DEFAULT 0,
            channelsCount INTEGER DEFAULT 0,
            moviesCount INTEGER DEFAULT 0,
            seriesCount INTEGER DEFAULT 0,
            config TEXT NOT NULL,
            createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const progressTable = `
        CREATE TABLE IF NOT EXISTS user_media_progress (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            media_id TEXT NOT NULL,
            playlist_id TEXT NOT NULL,
            current_time FLOAT DEFAULT 0,
            duration FLOAT DEFAULT 0,
            updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, media_id, playlist_id)
        );
    `;

    const logsTable = `
        CREATE TABLE IF NOT EXISTS system_logs (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT,
            createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        if (isPostgres) {
            await db.query(usersTable);
            await db.query(statsTable);
            await db.query(playlistsTable);
            await db.query(progressTable);
            await db.query(logsTable);
            console.log('[DATABASE] Tabelas PostgreSQL prontas!');
        } else {
            const run = (sql) => new Promise((resolve, reject) => {
                db.run(sql, (err) => err ? reject(err) : resolve());
            });

            await run(usersTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('BOOLEAN DEFAULT true', 'INTEGER DEFAULT 1').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            await run(statsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            await run(playlistsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME').replace(/REFERENCES\s+users\(id\)\s+ON\s+DELETE\s+CASCADE/g, 'REFERENCES users(id) ON DELETE CASCADE'));
            await run(progressTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME').replace(/REFERENCES\s+users\(id\)\s+ON\s+DELETE\s+CASCADE/g, 'REFERENCES users(id) ON DELETE CASCADE'));
            await run(logsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            console.log('[DATABASE] Tabelas SQLite prontas!');
        }
    } catch (error) {
        console.error('[DATABASE] Erro ao inicializar tabelas:', error);
    }
};

module.exports = {
    query,
    initializeTables,
    isPostgres
};

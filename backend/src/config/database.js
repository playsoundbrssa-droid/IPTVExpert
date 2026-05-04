// const sqlite3 = require('sqlite3').verbose(); // Removido do topo para evitar erro no Render quando DATABASE_URL está presente
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
    const sqlite3 = require('sqlite3').verbose();
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    db = new sqlite3.Database(path.join(dataDir, 'database.sqlite'));
}

const query = (text, params) => {
    if (isPostgres) return db.query(text, params);
    return new Promise((resolve, reject) => {
        db.all(text, params, function(err, rows) {
            if (err) reject(err);
            else resolve({ rows, lastInsertId: this.lastID });
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
            can_download BOOLEAN DEFAULT false,
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
            last_position FLOAT DEFAULT 0,
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

            // Migração: Adiciona colunas que podem estar faltando em tabelas antigas
            const alterUsers = [
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_download BOOLEAN DEFAULT false'
            ];
            for (const sql of alterUsers) {
                await db.query(sql).catch(err => console.log('[DB MIGRATION] Coluna já existe ou erro:', err.message));
            }

            const alterPlaylists = [
                'ALTER TABLE user_playlists ADD COLUMN IF NOT EXISTS channelscount INTEGER DEFAULT 0',
                'ALTER TABLE user_playlists ADD COLUMN IF NOT EXISTS moviescount INTEGER DEFAULT 0',
                'ALTER TABLE user_playlists ADD COLUMN IF NOT EXISTS seriescount INTEGER DEFAULT 0'
            ];
            for (const sql of alterPlaylists) {
                await db.query(sql).catch(err => console.log('[DB MIGRATION] Coluna já existe ou erro:', err.message));
            }

            console.log('[DATABASE] Tabelas PostgreSQL prontas!');
        } else {
            const run = (sql) => new Promise((resolve, reject) => {
                db.run(sql, (err) => err ? reject(err) : resolve());
            });

            await run(usersTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('BOOLEAN DEFAULT true', 'INTEGER DEFAULT 1').replace('BOOLEAN DEFAULT false', 'INTEGER DEFAULT 0').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            await run(statsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            await run(playlistsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            await run(progressTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            await run(logsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            
            // SQLite migração básica
            await run('ALTER TABLE users ADD COLUMN can_download INTEGER DEFAULT 0').catch(() => {});
            await run('ALTER TABLE user_playlists ADD COLUMN channelsCount INTEGER DEFAULT 0').catch(() => {});
            await run('ALTER TABLE user_playlists ADD COLUMN moviesCount INTEGER DEFAULT 0').catch(() => {});
            await run('ALTER TABLE user_playlists ADD COLUMN seriesCount INTEGER DEFAULT 0').catch(() => {});

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

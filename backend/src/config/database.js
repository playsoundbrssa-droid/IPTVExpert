const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

// Se houver uma URL de banco de dados (Produção), usa PostgreSQL
if (process.env.DATABASE_URL) {
    // Configuração robusta de SSL para Supabase no Railway/Render
    const poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    };

    db = new Pool(poolConfig);
    console.log('--- [DATABASE] Conectado ao PostgreSQL (Produção) ---');
} else {
    // Caso contrário, usa SQLite (Desenvolvimento Local)
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'database.sqlite');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    console.log('--- [DATABASE] Conectado ao SQLite (Local) ---');
}

// Helper para abstrair a diferença entre os drivers (Sync vs Async)
const query = async (text, params) => {
    if (process.env.DATABASE_URL) {
        return await db.query(text, params);
    } else {
        const stmt = db.prepare(text);
        if (text.trim().toUpperCase().startsWith('SELECT')) {
            const result = stmt.all(...(params || []));
            return { rows: result, rowCount: result.length };
        } else {
            const result = stmt.run(...(params || []));
            return { rowCount: result.changes, lastInsertId: result.lastInsertRowid };
        }
    }
};

// Nova função para criar as tabelas automaticamente na nuvem
const initializeTables = async () => {
    console.log('[DATABASE] Verificando tabelas...');
    
    const usersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            role TEXT DEFAULT 'user',
            googleId TEXT UNIQUE,
            avatar TEXT,
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const statsTable = `
        CREATE TABLE IF NOT EXISTS media_stats (
            id SERIAL PRIMARY KEY,
            media_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            logo TEXT,
            group_name TEXT,
            stream_url TEXT,
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

    try {
        if (process.env.DATABASE_URL) {
            await db.query(usersTable);
            await db.query(statsTable);
            await db.query(playlistsTable);
            
            // Tenta adicionar as colunas caso a tabela já existisse antes
            try {
                await db.query("ALTER TABLE users ADD COLUMN googleId TEXT UNIQUE");
            } catch (e) { /* Coluna pode já existir */ }
            try {
                await db.query("ALTER TABLE users ADD COLUMN avatar TEXT");
            } catch (e) { /* Coluna pode já existir */ }

            console.log('[DATABASE] Tabelas PostgreSQL prontas!');
        } else {
            db.exec(usersTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('BOOLEAN DEFAULT true', 'INTEGER DEFAULT 1').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            db.exec(statsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME'));
            db.exec(playlistsTable.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('TIMESTAMP WITH TIME ZONE', 'DATETIME').replace(/REFERENCES\s+users\(id\)\s+ON\s+DELETE\s+CASCADE/g, 'REFERENCES users(id) ON DELETE CASCADE'));
            
            // Tenta adicionar as colunas no SQLite caso a tabela já existisse antes
            try {
                db.exec("ALTER TABLE users ADD COLUMN googleId TEXT UNIQUE");
            } catch (e) { /* Coluna pode já existir */ }
            try {
                db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
            } catch (e) { /* Coluna pode já existir */ }

            console.log('[DATABASE] Tabelas SQLite prontas!');
        }
    } catch (error) {
        console.error('[DATABASE ERROR] Erro ao criar tabelas:', error.message);
    }
};

module.exports = {
    query,
    initializeTables,
    original: db,
    isPostgres: !!process.env.DATABASE_URL
};

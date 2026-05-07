let client = null;
let connected = false;

// Fallback em memória quando Redis não está disponível
const memoryCache = new Map();

const initRedis = async () => {
    if (process.env.REDIS_URL) {
        try {
            const redis = require('redis');
            client = redis.createClient({ url: process.env.REDIS_URL });
            client.on('error', (err) => {
                console.warn('[CACHE] Redis error, usando cache em memória:', err.message);
                connected = false;
            });
            client.on('connect', () => {
                connected = true;
                console.log('[CACHE] ✅ Redis conectado.');
            });
            await client.connect();
        } catch (err) {
            console.warn('[CACHE] Redis indisponível, usando cache em memória:', err.message);
            connected = false;
        }
    } else {
        console.log('[CACHE] REDIS_URL não configurado, usando cache em memória.');
    }
};

initRedis();

module.exports = {
    get: async (key) => {
        try {
            if (connected && client) {
                const data = await client.get(key);
                return data ? JSON.parse(data) : null;
            }
            // Fallback memória
            const entry = memoryCache.get(key);
            if (!entry) return null;
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                memoryCache.delete(key);
                return null;
            }
            return entry.value;
        } catch (err) {
            console.error('[CACHE GET] Erro:', err.message);
            // Fallback final
            const entry = memoryCache.get(key);
            return entry?.value || null;
        }
    },
    set: async (key, value, ttl = 3600) => {
        try {
            // Sempre salvar em memória também (backup)
            memoryCache.set(key, { 
                value, 
                expiresAt: Date.now() + (ttl * 1000) 
            });
            
            if (connected && client) {
                await client.set(key, JSON.stringify(value), { EX: ttl });
            }
        } catch (err) {
            console.error('[CACHE SET] Erro:', err.message);
        }
    },
    del: async (key) => {
        try {
            memoryCache.delete(key);
            if (connected && client) {
                await client.del(key);
            }
        } catch (err) {
            console.error('[CACHE DEL] Erro:', err.message);
        }
    }
};
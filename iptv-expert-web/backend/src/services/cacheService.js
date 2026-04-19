const redis = require('redis');

const client = redis.createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => console.log('Redis Client Error', err));
client.connect().catch(console.error);

module.exports = {
    get: async (key) => {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    },
    set: async (key, value, ttl = 3600) => {
        await client.set(key, JSON.stringify(value), { EX: ttl });
    },
    del: async (key) => {
        await client.del(key);
    }
};
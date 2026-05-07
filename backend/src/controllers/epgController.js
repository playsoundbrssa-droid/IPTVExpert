const epgService = require('../services/epgService');
const cacheService = require('../services/cacheService');

exports.getEpgForChannel = async (req, res, next) => {
    try {
        const { channelId } = req.params;
        const { cacheKey } = req.query;
        if (!cacheKey) {
            return res.status(400).json({ error: 'cacheKey é obrigatório para recuperar EPG' });
        }
        const programs = await epgService.getPrograms(cacheKey, channelId);
        res.json(programs);
    } catch (error) {
        next(error);
    }
};

exports.getNowPlaying = async (req, res, next) => {
    try {
        const { cacheKey } = req.query;
        if (!cacheKey) return res.status(400).json({ error: 'cacheKey é obrigatório' });
        const result = await epgService.getNowPlaying(cacheKey);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.importEpg = async (req, res, next) => {
    try {
        const result = await epgService.fetchAndParse(req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// GET /api/epg/grid — retorna dados do cache (usado pela EpgPage quando há cache)
exports.getGrid = async (req, res, next) => {
    try {
        const { cacheKey } = req.query;
        if (!cacheKey) return res.status(400).json({ error: 'cacheKey é obrigatório' });
        const data = await cacheService.get(cacheKey);
        res.json(data || {});
    } catch (error) {
        next(error);
    }
};

// GET /api/epg/xtream — busca EPG de um lote de canais via Xtream short_epg
// Query: server, username, password, streamIds (comma-separated)
exports.getXtreamEpg = async (req, res, next) => {
    try {
        const { server, username, password, streamIds } = req.query;
        if (!server || !username || !password) {
            return res.status(400).json({ error: 'server, username e password são obrigatórios' });
        }

        // Se streamIds fornecidos, buscar apenas esses canais
        const ids = streamIds ? streamIds.split(',').filter(Boolean).slice(0, 50) : [];
        
        if (ids.length === 0) {
            return res.json({ data: {}, message: 'Nenhum stream_id fornecido' });
        }

        console.log(`[EPG XTREAM] Buscando EPG para ${ids.length} canais...`);
        const data = await epgService.fetchXtreamBatch(server, username, password, ids);
        
        console.log(`[EPG XTREAM] ✅ ${Object.keys(data).length} canais com EPG encontrado.`);
        res.json({ data });
    } catch (error) {
        console.error('[EPG XTREAM] Erro:', error.message);
        res.json({ data: {}, error: error.message });
    }
};
const epgService = require('../services/epgService');
const cacheService = require('../services/cacheService');
const xtreamApiService = require('../services/xtreamApiService');

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

// GET /api/epg/grid — retorna TODOS os programas do cache (usado pela EpgPage)
exports.getGrid = async (req, res, next) => {
    try {
        const { cacheKey } = req.query;
        if (!cacheKey) return res.status(400).json({ error: 'cacheKey é obrigatório' });

        const data = await cacheService.get(cacheKey);
        if (!data) {
            return res.json({});
        }
        res.json(data);
    } catch (error) {
        console.error('[EPG GRID] Erro:', error.message);
        next(error);
    }
};

// GET /api/epg/xtream — busca EPG diretamente do servidor Xtream, faz parse, cacheia e retorna
// Parâmetros: server, username, password
exports.getXtreamEpg = async (req, res, next) => {
    try {
        const { server, username, password } = req.query;
        if (!server || !username || !password) {
            return res.status(400).json({ error: 'server, username e password são obrigatórios' });
        }

        // Verificar se já temos no cache (evita buscar toda hora)
        const cacheKey = `epg_xtream_${Buffer.from(server + username).toString('base64').substring(0, 20)}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            console.log('[EPG XTREAM] Retornando do cache.');
            return res.json({ data: cached, cacheKey, fromCache: true });
        }

        // Buscar o XMLTV do servidor Xtream
        console.log(`[EPG XTREAM] Buscando EPG do servidor: ${server.split('?')[0]}`);
        const result = await epgService.fetchAndParse({
            url: server,
            type: 'xtream',
            username,
            password
        });

        if (result.success) {
            // Recuperar os dados que foram armazenados no cache
            const data = await cacheService.get(result.cacheKey);
            
            // Copiar para nosso cacheKey padronizado
            if (data) {
                await cacheService.set(cacheKey, data, 14400); // 4 horas
            }

            return res.json({ 
                data: data || {}, 
                cacheKey, 
                totalChannels: result.totalChannels,
                fromCache: false 
            });
        }

        res.json({ data: {}, cacheKey, totalChannels: 0 });
    } catch (error) {
        console.error('[EPG XTREAM] Erro:', error.message);
        // Não quebrar — retorna vazio em vez de erro 500
        res.json({ data: {}, cacheKey: null, error: error.message });
    }
};
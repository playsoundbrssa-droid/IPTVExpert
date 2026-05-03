const epgService = require('../services/epgService');

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
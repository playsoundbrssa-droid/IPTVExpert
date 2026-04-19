const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const cacheService = require('./cacheService');

exports.fetchAndParse = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'text' });
        const result = await parseStringPromise(response.data);
        
        const programs = result.tv.programme || [];
        
        // Group by channel ID
        const grouped = programs.reduce((acc, prog) => {
            const channelId = prog.$?.channel;
            if (channelId) {
                if (!acc[channelId]) acc[channelId] = [];
                acc[channelId].push({
                    start: prog.$?.start,
                    stop: prog.$?.stop,
                    title: prog.title?.[0]?._ || prog.title?.[0],
                    desc: prog.desc?.[0]?._ || prog.desc?.[0]
                });
            }
            return acc;
        }, {});

        // Save to cache (24 hours TTL)
        const cacheKey = `epg_data_${Buffer.from(url).toString('base64').substring(0, 16)}`;
        await cacheService.set(cacheKey, grouped, 86400);

        return { success: true, message: 'EPG importado e agrupado com sucesso', totalChannels: Object.keys(grouped).length, cacheKey };
    } catch (error) {
        throw new Error(`Falha ao processar EPG: ${error.message}`);
    }
};

exports.getPrograms = async (cacheKey, channelId) => {
    try {
        const data = await cacheService.get(cacheKey);
        if (data && data[channelId]) {
            return data[channelId];
        }
        return [];
    } catch (error) {
        console.error('Erro ao buscar programas EPG', error);
        return [];
    }
};
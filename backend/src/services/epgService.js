const xtreamApiService = require('../services/xtreamApiService');
const cacheService = require('./cacheService');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

// ─── EPG via XMLTV (para listas M3U) ───
exports.fetchAndParse = async (params) => {
    try {
        let { url, type, username, password } = params;

        if (type === 'xtream' && !url.includes('xmltv.php')) {
            const baseUrl = url.endsWith('/') ? url : url + '/';
            url = `${baseUrl}xmltv.php?username=${username}&password=${password}`;
        }

        console.log(`[EPG SERVICE] Buscando EPG de: ${url.split('?')[0]}...`);

        const response = await axios.get(url, { 
            responseType: 'text',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
            timeout: 120000,
            maxContentLength: 150 * 1024 * 1024
        });

        console.log(`[EPG SERVICE] XML baixado (${Math.round(response.data.length / 1024)} KB). Parsing...`);
        
        const result = await parseStringPromise(response.data, { explicitArray: false });
        
        if (!result.tv || !result.tv.programme) {
            return { success: false, message: 'Nenhuma programação encontrada no arquivo.' };
        }

        let programs = result.tv.programme;
        if (!Array.isArray(programs)) programs = [programs];
        
        const grouped = programs.reduce((acc, prog) => {
            const channelId = prog.$.channel;
            if (channelId) {
                if (!acc[channelId]) acc[channelId] = [];
                const getText = (obj) => {
                    if (!obj) return '';
                    if (typeof obj === 'string') return obj;
                    if (obj._) return obj._;
                    if (Array.isArray(obj)) return getText(obj[0]);
                    return '';
                };
                acc[channelId].push({
                    start: prog.$.start,
                    stop: prog.$.stop,
                    title: getText(prog.title),
                    desc: getText(prog.desc)
                });
            }
            return acc;
        }, {});

        const cacheKey = `epg_data_${Buffer.from(url).toString('base64').substring(0, 16)}`;
        await cacheService.set(cacheKey, grouped, 86400);

        console.log(`[EPG SERVICE] ✅ ${Object.keys(grouped).length} canais mapeados.`);
        return { success: true, totalChannels: Object.keys(grouped).length, cacheKey };
    } catch (error) {
        console.error('[EPG SERVICE ERROR]', error.message);
        throw new Error(`Falha ao processar EPG: ${error.message}`);
    }
};

// ─── EPG via Xtream API (rápido, sem XMLTV) ───
// Busca short_epg para um lote de stream_ids
exports.fetchXtreamBatch = async (server, username, password, streamIds) => {
    const results = {};
    
    // Processar em lotes de 10 para não sobrecarregar
    const batchSize = 10;
    for (let i = 0; i < streamIds.length; i += batchSize) {
        const batch = streamIds.slice(i, i + batchSize);
        const promises = batch.map(async (streamId) => {
            try {
                const data = await xtreamApiService.getShortEPG(server, username, password, streamId);
                if (data?.epg_listings && Array.isArray(data.epg_listings)) {
                    results[streamId] = data.epg_listings.map(ep => {
                        // Decodificar Base64 se necessário
                        let title = ep.title || '';
                        let desc = ep.description || '';
                        try {
                            if (title && /^[A-Za-z0-9+/=]+$/.test(title) && title.length > 4) {
                                title = Buffer.from(title, 'base64').toString('utf-8');
                            }
                        } catch (e) {}
                        try {
                            if (desc && /^[A-Za-z0-9+/=]+$/.test(desc) && desc.length > 4) {
                                desc = Buffer.from(desc, 'base64').toString('utf-8');
                            }
                        } catch (e) {}

                        return {
                            title,
                            desc,
                            start: ep.start || '',
                            stop: ep.end || ep.stop || '',
                            start_timestamp: ep.start_timestamp,
                            stop_timestamp: ep.stop_timestamp
                        };
                    });
                }
            } catch (e) {
                // Silenciar erros individuais — canal pode não ter EPG
            }
        });
        await Promise.all(promises);
    }
    
    return results;
};

// ─── Helpers ───
const parseDate = (d) => {
    if (!d) return null;
    try {
        // Formato EPG: 20231027120000 +0000
        const clean = d.split(' ')[0];
        if (clean.length < 12) return null;
        const y = clean.substring(0, 4), m = clean.substring(4, 6);
        const day = clean.substring(6, 8), h = clean.substring(8, 10);
        const min = clean.substring(10, 12);
        return new Date(`${y}-${m}-${day}T${h}:${min}:00`);
    } catch (e) { return null; }
};

exports.getPrograms = async (cacheKey, channelId) => {
    try {
        const data = await cacheService.get(cacheKey);
        if (data && data[channelId]) return data[channelId];
        return [];
    } catch (error) { return []; }
};

exports.getNowPlaying = async (cacheKey) => {
    try {
        const data = await cacheService.get(cacheKey);
        if (!data) return {};
        
        const now = new Date();
        const result = {};
        
        Object.keys(data).forEach(channelId => {
            const programs = data[channelId];
            if (!Array.isArray(programs)) return;
            const current = programs.find(p => {
                const start = parseDate(p.start);
                const stop = parseDate(p.stop);
                return start && stop && now >= start && now <= stop;
            });
            if (current) result[channelId] = { current };
        });
        
        return result;
    } catch (error) {
        console.error('[EPG] Erro getNowPlaying:', error.message);
        return {};
    }
};
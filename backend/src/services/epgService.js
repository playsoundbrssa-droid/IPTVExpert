const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const cacheService = require('./cacheService');
const http = require('http');
const https = require('https');

// Reuse the same logic for robust fetching
const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Accept-Encoding': 'gzip, deflate, br'
};

exports.fetchAndParse = async (params) => {
    try {
        let { url, type, username, password } = params;

        // Build Xtream XMLTV URL if needed
        if (type === 'xtream' && !url.includes('xmltv.php')) {
            const baseUrl = url.endsWith('/') ? url : url + '/';
            url = `${baseUrl}xmltv.php?username=${username}&password=${password}`;
        }

        console.log(`[EPG SERVICE] Buscando EPG de: ${url.split('?')[0]}...`);

        const response = await axios.get(url, { 
            responseType: 'text',
            headers: commonHeaders,
            timeout: 120000, // EPG files can be huge
            maxContentLength: 150 * 1024 * 1024 // 150MB limit
        });

        console.log(`[EPG SERVICE] XML baixado (${Math.round(response.data.length / 1024)} KB). Parsing...`);
        
        const result = await parseStringPromise(response.data, { explicitArray: false });
        
        if (!result.tv || !result.tv.programme) {
            console.warn('[EPG SERVICE] Nenhum programa encontrado no XML.');
            return { success: false, message: 'Nenhuma programação encontrada no arquivo.' };
        }

        let programs = result.tv.programme;
        if (!Array.isArray(programs)) programs = [programs];
        
        // Group by channel ID
        const grouped = programs.reduce((acc, prog) => {
            const channelId = prog.$.channel;
            if (channelId) {
                if (!acc[channelId]) acc[channelId] = [];
                
                // Helper to get text from potential object/array
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

        // Save to cache (24 hours TTL)
        const cacheKey = `epg_data_${Buffer.from(url).toString('base64').substring(0, 16)}`;
        await cacheService.set(cacheKey, grouped, 86400);

        console.log(`[EPG SERVICE] ✅ Sucesso! ${Object.keys(grouped).length} canais mapeados.`);
        return { 
            success: true, 
            message: 'EPG importado com sucesso', 
            totalChannels: Object.keys(grouped).length, 
            cacheKey 
        };
    } catch (error) {
        console.error('[EPG SERVICE ERROR]', error.message);
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
const axios = require('axios');
const http = require('http');
const https = require('https');
const dns = require('dns');

// DNS-over-HTTPS (DoH) Resolver - Multi-Source (Cloudflare + Google)
// Usamos instâncias limpas de axios para evitar loops de DNS
const resolveDoh = async (hostname) => {
    const cleanHost = hostname.trim().split(':')[0]; 
    if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) return cleanHost; // Se já for IP, retorna

    const providers = [
        { url: `https://1.1.1.1/dns-query?name=${cleanHost}&type=A`, headers: { 'accept': 'application/dns-json' } },
        { url: `https://dns.google/resolve?name=${cleanHost}&type=A`, headers: { 'accept': 'application/json' } }
    ];

    for (const provider of providers) {
        try {
            // Chamada DoH usando agentes padrão para evitar recursão
            const response = await axios.get(provider.url, { 
                headers: provider.headers,
                timeout: 5000,
                httpAgent: new http.Agent(),
                httpsAgent: new https.Agent()
            });

            const data = response.data;
            if (data && data.Answer) {
                const firstA = data.Answer.find(a => a.type === 1);
                if (firstA) {
                    console.log(`[XTREAM DNS DoH] ✅ Resolvido (${cleanHost}): ${firstA.data}`);
                    return firstA.data;
                }
            }
        } catch (error) {
            console.warn(`[XTREAM DNS DoH WARN] Provedor ${provider.url.split('/')[2]} indisponível.`);
        }
    }
    return null;
};

// Custom DNS Resolver logic to bypass ISP blocks
const customLookup = (hostname, options, callback) => {
    // We call resolveDoh but handle it as a promise to remain inside the lookup callback pattern
    resolveDoh(hostname).then(dohIp => {
        if (dohIp) {
            if (options.all) {
                return callback(null, [{ address: dohIp, family: 4 }]);
            }
            return callback(null, dohIp, 4);
        }

        // Fallback to dns.resolve4 if DoH fails
        dns.resolve4(hostname, (err, addresses) => {
            if (err || !addresses.length) {
                // Last fallback to standard lookup
                return dns.lookup(hostname, options, callback);
            }
            if (options.all) {
                return callback(null, [{ address: addresses[0], family: 4 }]);
            }
            callback(null, addresses[0], 4);
        });
    }).catch(err => {
        // Ultimate fallback on any unexpected error
        dns.lookup(hostname, options, callback);
    });
};

const axiosAgents = {
    httpAgent: new http.Agent({ lookup: customLookup, keepAlive: true }),
    httpsAgent: new https.Agent({ lookup: customLookup, keepAlive: true, rejectUnauthorized: false })
};

const buildUrl = (serverUrl, params) => {
    const base = serverUrl.replace(/\/$/, '');
    const url = new URL(`${base}/player_api.php`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    return url.toString();
};

const makeRequest = async (serverUrl, username, password, action, extraParams = {}) => {
    try {
        const params = { username, password, ...extraParams };
        if (action) params.action = action;
        const response = await axios.get(buildUrl(serverUrl, params), {
            ...axiosAgents,
            timeout: 120000
        });
        return response.data;
    } catch (error) {
        throw new Error(`Xtream API Error: ${error.message} (Action: ${action || 'auth'})`);
    }
};

exports.authenticate = (serverUrl, username, password) => makeRequest(serverUrl, username, password);

exports.getLiveCategories = (serverUrl, username, password) => makeRequest(serverUrl, username, password, 'get_live_categories');
exports.getLiveStreams = (serverUrl, username, password, categoryId) => makeRequest(serverUrl, username, password, 'get_live_streams', categoryId ? { category_id: categoryId } : {});

exports.getVodCategories = (serverUrl, username, password) => makeRequest(serverUrl, username, password, 'get_vod_categories');
exports.getVodStreams = (serverUrl, username, password, categoryId) => makeRequest(serverUrl, username, password, 'get_vod_streams', categoryId ? { category_id: categoryId } : {});

exports.getSeriesCategories = (serverUrl, username, password) => makeRequest(serverUrl, username, password, 'get_series_categories');
exports.getSeries = (serverUrl, username, password, categoryId) => makeRequest(serverUrl, username, password, 'get_series', categoryId ? { category_id: categoryId } : {});
exports.getSeriesInfo = (serverUrl, username, password, seriesId) => makeRequest(serverUrl, username, password, 'get_series_info', { series_id: seriesId });
exports.getVodInfo = (serverUrl, username, password, vodId) => makeRequest(serverUrl, username, password, 'get_vod_info', { vod_id: vodId });
exports.getShortEPG = (serverUrl, username, password, streamId) => makeRequest(serverUrl, username, password, 'get_short_epg', { stream_id: streamId });

exports.importAsPlaylist = async (serverUrl, username, password) => {
    try {
        console.log(`[XTREAM IMPORT] Iniciando importação completa de ${serverUrl}`);
        
        // Validar credenciais primeiro
        try {
            const authCheck = await makeRequest(serverUrl, username, password);
            if (!authCheck || !authCheck.user_info) {
                throw new Error('Falha na autenticação. Verifique suas credenciais.');
            }
            if (authCheck.user_info.status !== 'Active') {
                throw new Error(`A conta Xtream não está ativa (Status: ${authCheck.user_info.status}).`);
            }
        } catch (authErr) {
            throw new Error(`Erro ao conectar no servidor Xtream: ${authErr.message}`);
        }

        // Buscamos categorias primeiro
        const [liveCats, vodCats, seriesCats] = await Promise.all([
            makeRequest(serverUrl, username, password, 'get_live_categories').catch(() => []),
            makeRequest(serverUrl, username, password, 'get_vod_categories').catch(() => []),
            makeRequest(serverUrl, username, password, 'get_series_categories').catch(() => [])
        ]);

        const buildCatMap = (cats) => cats.reduce((acc, cat) => {
            acc[String(cat.category_id)] = cat.category_name;
            return acc;
        }, {});

        const catMaps = {
            live: buildCatMap(liveCats),
            movie: buildCatMap(vodCats),
            series: buildCatMap(seriesCats)
        };

        // Buscamos tudo em paralelo, mas com tolerância a falhas individuais
        const [live, vod, series] = await Promise.all([
            makeRequest(serverUrl, username, password, 'get_live_streams').catch(() => []),
            makeRequest(serverUrl, username, password, 'get_vod_streams').catch(() => []),
            makeRequest(serverUrl, username, password, 'get_series').catch(() => []),
        ]);

        const normalize = (items, type) => {
            if (!Array.isArray(items)) return [];
            return items.map(item => {
                const streamId = item.stream_id || item.series_id || item.id;
                
                // Formatar URL dependendo do tipo
                const base = serverUrl.replace(/\/$/, '');
                let streamUrl = '';
                
                // Live TV: Adicionamos .ts para forçar detecção correta no player
                if (type === 'live') {
                    streamUrl = `${base}/${username}/${password}/${streamId}.ts`;
                } 
                // Movies: Caminho /movie/
                else if (type === 'movie') {
                    const ext = item.container_extension || 'mp4';
                    streamUrl = `${base}/movie/${username}/${password}/${streamId}.${ext}`;
                }
                // Series: Caminho /series/ 
                else if (type === 'series') {
                    const ext = item.container_extension || 'mp4';
                    streamUrl = `${base}/series/${username}/${password}/${streamId}.${ext}`;
                }

                return {
                    id: `xtream_${type}_${streamId}`,
                    name: item.name || item.title || 'Sem Nome',
                    logo: item.stream_icon || item.cover || null,
                    group: (() => {
                        // Resgata o nome da categoria mapeada pelo category_id
                        let g = (catMaps[type][String(item.category_id)] || item.category_name || 'Geral');
                        
                        if (type === 'series') {
                            g = g.replace(/^Filmes\s*\|\s*/i, 'Séries | ');
                            const upper = g.toUpperCase();
                            if (!upper.startsWith('SÉRIES |') && !upper.startsWith('SERIES |')) {
                                if (upper.includes('NOVELA') || upper.includes('PROGRAMA') || upper.includes('TV SHOW')) {
                                    g = 'Séries | ' + g;
                                }
                            }
                        } else if (type === 'movie') {
                            g = g.replace(/^Séries\s*\|\s*/i, 'Filmes | ');
                        }
                        return g;
                    })(),
                    streamUrl,
                    type: type === 'live' ? 'channel' : (type === 'movie' ? 'movie' : 'series')
                };
            });
        };

        const channelsList = normalize(live, 'live');
        const moviesList = normalize(vod, 'movie');
        const seriesList = normalize(series, 'series');

        const groupByType = (arr) => arr.reduce((acc, item) => {
            const groupName = item.group || 'Geral';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, Object.create(null));

        const totalParsed = channelsList.length + moviesList.length + seriesList.length;

        if (totalParsed === 0) {
            throw new Error('Nenhuma mídia foi encontrada nesta conta Xtream.');
        }

        return {
            total: totalParsed,
            channels: { list: channelsList, groups: groupByType(channelsList) },
            movies: { list: moviesList, groups: groupByType(moviesList) },
            series: { list: seriesList, groups: groupByType(seriesList) }
        };
    } catch (error) {
        console.error('[XTREAM IMPORT ERROR]', error.message);
        throw new Error(`Falha na importação Xtream: ${error.message}`);
    }
};
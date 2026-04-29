const axios = require('axios');
const http = require('http');
const https = require('https');
const dns = require('dns');
const parser = require('iptv-playlist-parser');
const crypto = require('crypto');

// DNS-over-HTTPS (DoH) Resolver - Multi-Source (Cloudflare + Google)
// Usamos instâncias limpas de axios para evitar loops de DNS
const resolveDoh = async (hostname) => {
    const cleanHost = hostname.trim().split(':')[0]; 
    if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) return cleanHost; 

    console.log(`[DNS] Resolvendo: ${cleanHost} via DoH...`);

    const providers = [
        { url: `https://1.1.1.1/dns-query?name=${cleanHost}&type=A`, headers: { 'accept': 'application/dns-json' } },
        { url: `https://dns.google/resolve?name=${cleanHost}&type=A`, headers: { 'accept': 'application/json' } }
    ];

    for (const provider of providers) {
        try {
            const response = await axios.get(provider.url, { 
                headers: provider.headers,
                timeout: 3000,
                httpAgent: new http.Agent(),
                httpsAgent: new https.Agent()
            });

            const data = response.data;
            if (data && data.Answer) {
                const firstA = data.Answer.find(a => a.type === 1);
                if (firstA) {
                    console.log(`[DNS] ✅ DoH (${provider.url.includes('1.1.1.1') ? 'Cloudflare' : 'Google'}): ${cleanHost} -> ${firstA.data}`);
                    return firstA.data;
                }
            }
        } catch (error) {
            console.warn(`[DNS] ❌ DoH Falhou (${provider.url.includes('1.1.1.1') ? 'Cloudflare' : 'Google'}): ${error.message}`);
        }
    }
    return null;
};

const cleanGroupName = (name, type) => {
    if (!name) return 'Geral';
    let clean = name;
    if (type === 'series') {
        clean = clean.replace(/^Filmes\s*\|\s*/i, 'Séries | ');
        // Adiciona prefixo se for novela ou programa e não tiver
        const upper = clean.toUpperCase();
        if (!upper.startsWith('SÉRIES |') && !upper.startsWith('SERIES |')) {
            if (upper.includes('NOVELA') || upper.includes('PROGRAMA') || upper.includes('TV SHOW')) {
                clean = 'Séries | ' + clean;
            }
        }
    }
    if (type === 'movies') {
        clean = clean.replace(/^Séries\s*\|\s*/i, 'Filmes | ');
    }
    return clean;
};


// Custom DNS Resolver logic to bypass ISP blocks
const customLookup = (hostname, options, callback) => {
    resolveDoh(hostname).then(dohIp => {
        if (dohIp) {
            if (options.all) {
                return callback(null, [{ address: dohIp, family: 4 }]);
            }
            return callback(null, dohIp, 4);
        }

        console.log(`[DNS] ⚠️ DoH falhou para ${hostname}, tentando DNS do sistema...`);

        // Fallback to dns.resolve4 if DoH fails
        dns.resolve4(hostname, (err, addresses) => {
            if (err || !addresses.length) {
                // Last fallback to standard lookup
                return dns.lookup(hostname, options, (lErr, address, family) => {
                    if (lErr) console.error(`[DNS] ❌ Falha total para ${hostname}: ${lErr.message}`);
                    callback(lErr, address, family);
                });
            }
            
            console.log(`[DNS] ✅ Sistema (resolve4): ${hostname} -> ${addresses[0]}`);
            if (options.all) {
                return callback(null, [{ address: addresses[0], family: 4 }]);
            }
            callback(null, addresses[0], 4);
        });
    }).catch(err => {
        console.error(`[DNS] ❌ Erro inesperado em customLookup para ${hostname}:`, err.message);
        dns.lookup(hostname, options, callback);
    });
};

const axiosAgents = {
    httpAgent: new http.Agent({ lookup: customLookup, keepAlive: true }),
    httpsAgent: new https.Agent({ lookup: customLookup, keepAlive: true, rejectUnauthorized: false })
};

const categorizeItem = (item) => {
    if (!item) return 'channels';
    
    const groupName = String(item.group?.title || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();
    const url = String(item.url || '').toLowerCase();

    // 1. PADRÕES DE SÉRIES (Prioridade Máxima)
    const seriesPatterns = [
        /s\d{2}e\d{2}/i,
        /\d{1,2}x\d{1,2}/i,
        /temporada|season/i,
        /episodio|episode/i,
        /novela/i,
        /programa de tv/i
    ];
    const matchesSeriesPattern = seriesPatterns.some(pattern => pattern.test(name));
    if (matchesSeriesPattern) return 'series';

    // 2. EXTENSÕES DE VOD (Sinal extremamente forte)
    const vodExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.ts_vod']; // Alguns provedores usam .ts_vod
    const isVodExtension = vodExtensions.some(ext => url.endsWith(ext));
    
    // 3. PALAVRAS-CHAVE POR GRUPO (Sinal Médio)
    const isSeriesGroup = groupName.includes('serie') || groupName.includes('série') || groupName.includes('novela') || groupName.includes('programa') || groupName.includes('season');
    const isMovieGroup = groupName.includes('filme') || groupName.includes('movie') || groupName.includes('cinema') || groupName.includes('vod');
    const isLiveGroup = groupName.includes('live') || groupName.includes('tv') || groupName.includes('canais') || groupName.includes('channels') || groupName.includes('ao vivo');

    // 4. DECISÃO HIERÁRQUICA FINAL

    // SE É GRUPO DE CANAIS, É CANAL (Prioridade para evitar vazamento)
    if (isLiveGroup && !matchesSeriesPattern) return 'channels';
    
    // Se a URL contém padrões EXPLÍCITOS de Live TV do Xtream
    if (url.includes('/live/') || url.includes('player_api.php?action=get_live_streams')) return 'channels';

    // Verificações de VOD certeiras
    if (isVodExtension) {
        // Se tem qualquer padrão de série, É SÉRIE
        if (matchesSeriesPattern) return 'series';
        
        // Se o grupo diz que é série, confiamos no grupo (mesmo sem padrão S01E01 identificado ainda)
        if (isSeriesGroup && !isMovieGroup) return 'series';

        // Se o grupo é de filmes/VOD
        if (isMovieGroup) return 'movies';
        
        return 'movies'; // Default para vídeos é filme
    }

    // Se explicitamente designado como série pelo grupo (e não é vídeo direto detectado acima)
    if (isSeriesGroup && !isLiveGroup) return 'series';

    // Se o grupo é de filmes/VOD, e NÃO parece ser Live TV
    if (isMovieGroup && !isLiveGroup) {
        return 'movies';
    }

    // Se a URL contém padrões de VOD comuns (ex: /movie/ ou /series/)
    if (url.includes('/movie/') || url.includes('/movies/')) return 'movies';
    if (url.includes('/series/')) return 'series';

    // Padrão: Canais de TV
    return 'channels';
};

exports.parseM3U = async (url) => {
    try {
        // Normalização agressiva do URL - Remove espaços e caracteres invisíveis
        let finalUrl = url.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'http://' + finalUrl;
        }

        console.log(`[M3U] Buscando lista: ${finalUrl}`);
        
        const response = await axios.get(finalUrl, { 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            },
            timeout: 60000, 
            maxContentLength: 250 * 1024 * 1024,
            responseType: 'text',
            ...axiosAgents 
        });
        
        const playlist = response.data;
        if (!playlist || typeof playlist !== 'string' || !playlist.includes('#EXTM3U')) {
            console.warn('[M3U] Conteúdo inválido recebido.');
            throw new Error('O link não retornou uma lista M3U válida. Verifique o endereço.');
        }

        console.log(`[M3U] ✅ Download concluído: ${playlist.length} bytes`);
        return exports.parseM3UContent(playlist);
    } catch (error) {
        let errorMsg = error.message;
        if (error.code === 'ECONNABORTED') errorMsg = 'O servidor demorou muito para responder (Timeout).';
        if (error.code === 'ENOTFOUND') errorMsg = 'Não foi possível encontrar o servidor (Erro de DNS).';
        if (error.response) {
            errorMsg = `Servidor retornou erro ${error.response.status}`;
        }
        
        console.error('[M3U ERROR]', {
            code: error.code,
            message: error.message,
            url: url
        });
        throw new Error(`Falha na importação: ${errorMsg}`);
    }
};

exports.parseM3UContent = (playlist) => {
    try {
        console.log(`[M3U PARSER] Analisando conteúdo (Tam: ${playlist.length} bytes)`);
        
        let result;
        try {
            result = parser.parse(playlist);
        } catch (parseErr) {
            console.error('[M3U PARSER] Erro na biblioteca iptv-playlist-parser:', parseErr.message);
            throw new Error('O formato desta lista M3U não é suportado ou está corrompido.');
        }
        const channels = [];
        const movies = [];
        const series = [];

        // Normalization & Categorization
        if (result && result.items && Array.isArray(result.items)) {
            result.items.forEach(item => {
                const safeUrl = item.url || '';
                if (!safeUrl) return; 

                // IGNORAR ITENS TÉCNICOS/LOGS (Caso vazem para a lista)
                const groupName = String(item.group?.title || '');
                const itemName = String(item.name || '');
                if (groupName.includes('[MSEController]') || itemName.includes('[MSEController]') ||
                    groupName.includes('MediaSource') || itemName.includes('MediaSource')) {
                    return;
                }

                const rawId = String(item.tvg?.id || item.name || 'item');
                const hash = crypto.createHash('md5').update(safeUrl).digest('hex').substring(0, 8);
                const uniqueId = `${rawId.replace(/\s+/g, '_')}-${hash}`;
                
                const type = categorizeItem(item);
                const normalized = {
                    id: uniqueId,
                    name: String(item.name || 'Sem Nome'),
                    logo: item.tvg?.logo ? String(item.tvg.logo) : null,
                    group: cleanGroupName(String(item.group?.title || 'Geral'), type),
                    streamUrl: safeUrl,
                    tvgId: item.tvg?.id ? String(item.tvg.id) : null
                };
                if (type === 'series') series.push(normalized);
                else if (type === 'movies') movies.push(normalized);
                else channels.push(normalized);
            });
        }

        // Agrupamento por categoria original da lista
        const groupByType = (arr) => arr.reduce((acc, item) => {
            const groupName = item.group || 'Geral';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, Object.create(null));

        const totalParsed = channels.length + movies.length + series.length;
        
        if (totalParsed === 0) {
            throw new Error('Nenhum canal ou mídia válido encontrado na lista. O formato pode ser incompatível.');
        }

        console.log(`[M3U PARSER] Sucesso: ${channels.length} canais, ${movies.length} filmes, ${series.length} séries.`);

        return {
            total: totalParsed,
            channels: { list: channels, groups: groupByType(channels) },
            movies: { list: movies, groups: groupByType(movies) },
            series: { list: series, groups: groupByType(series) }
        };
    } catch (error) {
        console.error('[M3U PARSER ERROR]', error.stack || error.message);
        throw new Error(`Falha ao analisar playlist: ${error.message}`);
    }
};
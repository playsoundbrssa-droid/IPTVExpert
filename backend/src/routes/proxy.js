const express = require('express');
const axios   = require('axios');
const http    = require('http');
const https   = require('https');
const dns     = require('dns');
const router  = express.Router();

// ── DoH Resolver (igual ao m3uParserService) ─────────────────────────────────
const resolveDoh = async (hostname) => {
    const cleanHost = hostname.trim().split(':')[0];
    if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) return cleanHost;

    const providers = [
        { url: `https://1.1.1.1/dns-query?name=${cleanHost}&type=A`, headers: { accept: 'application/dns-json' } },
        { url: `https://dns.google/resolve?name=${cleanHost}&type=A`, headers: { accept: 'application/json' } }
    ];
    for (const p of providers) {
        try {
            const r = await axios.get(p.url, {
                headers: p.headers, timeout: 5000,
                httpAgent: new http.Agent(), httpsAgent: new https.Agent()
            });
            const a = r.data?.Answer?.find(x => x.type === 1);
            if (a) { console.log(`[PROXY DoH] ✅ ${cleanHost} → ${a.data}`); return a.data; }
        } catch (_) {}
    }
    return null;
};

const customLookup = (hostname, options, callback) => {
    resolveDoh(hostname).then(ip => {
        if (ip) return callback(null, [{ address: ip, family: 4 }]);
        dns.resolve4(hostname, (err, addrs) => {
            if (err || !addrs?.length) return dns.lookup(hostname, options, callback);
            callback(null, [{ address: addrs[0], family: 4 }]);
        });
    }).catch(() => dns.lookup(hostname, options, callback));
};

const proxyAgents = {
    httpAgent:  new http.Agent ({ lookup: customLookup, keepAlive: true }),
    httpsAgent: new https.Agent({ lookup: customLookup, keepAlive: true, rejectUnauthorized: false })
};
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/proxy/fetch?url=...  — retorna texto bruto com bypass de DNS/CORS
router.get('/fetch', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Parâmetro url obrigatório.' });

    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'http://' + finalUrl;
    }

    try {
        console.log(`[PROXY FETCH] Baixando: ${finalUrl}`);
        const response = await axios.get(finalUrl, {
            ...proxyAgents,
            timeout: 120000,
            maxContentLength: 250 * 1024 * 1024,
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (SmartHub; SMART-TV; Linux/SmartTV) AppleWebKit/538.1 (KHTML, like Gecko) SamsungBrowser/2.0 TV Safari/538.1',
                'Accept': '*/*'
            }
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        console.log(`[PROXY FETCH] ✅ Sucesso: ${response.data.length} bytes`);
        res.send(response.data);
    } catch (error) {
        console.error(`[PROXY FETCH ERROR] ${finalUrl}: ${error.message}`);
        res.status(502).json({ error: `Falha ao baixar: ${error.message}` });
    }
});

router.get('/stream', async (req, res) => {
    try {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Sanitizar URL - remover espaços extras e garantir que o # não quebre a requisição
        // Alguns provedores usam # como parte do token no path
        // IMPORTANTE: axios/http descarta tudo após o # (fragmento). 
        // Precisamos escapar manualmente para que o servidor remoto receba o token completo.
        let finalTarget = targetUrl.trim().replace(/#/g, '%23');
        
        // Determinar se é manifest M3U8
        const isM3u8 = finalTarget.includes('.m3u8') || finalTarget.includes('type=m3u8');

        const commonHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': new URL(finalTarget).origin + '/',
            'Origin': new URL(finalTarget).origin
        };

        if (isM3u8) {
            // Se for playlist, baixar como texto e reescrever os links internos
            const response = await axios.get(finalTarget, {
                ...proxyAgents,
                headers: commonHeaders,
                timeout: 15000
            });

            let baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            const lines = response.data.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                // Ignorar linhas vazias ou comentários/tags do M3U
                if (!trimmed || trimmed.startsWith('#')) return line;

                // Converter URL relativa para absoluta
                let absoluteUrl = trimmed;
                if (!trimmed.startsWith('http')) {
                    absoluteUrl = new URL(trimmed, baseUrl).href;
                }

                // Retornar a linha passando pelo nosso proxy
                const currentProxyCall = `${req.protocol}://${req.get('host')}/api/proxy/stream?url=`;
                return `${currentProxyCall}${encodeURIComponent(absoluteUrl)}`;
            });

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(rewrittenLines.join('\n'));
        } else {
            // Se for stream de vídeo real (.ts, .mp4, etc.)
            const range = req.headers.range;
            const proxyHeaders = { ...commonHeaders };
            
            if (range) {
                proxyHeaders.Range = range;
            }

            const response = await axios({
                method: 'GET',
                url: finalTarget,
                responseType: 'stream',
                ...proxyAgents,
                headers: proxyHeaders,
                timeout: 30000,
                validateStatus: (status) => status < 400 || status === 416 // Aceitar 206 e 416
            });

            // Repassar headers importantes do upstream
            if (response.status === 206) res.status(206);
            
            const importantHeaders = [
                'content-type', 
                'content-length', 
                'content-range', 
                'accept-ranges'
            ];
            
            importantHeaders.forEach(h => {
                if (response.headers[h]) res.setHeader(h, response.headers[h]);
            });

            // Forçar detecção de MPEG-TS para IPTV se for genérico
            const currentContentType = response.headers['content-type'] || '';
            const isTsPath = targetUrl.toLowerCase().includes('.ts') || targetUrl.toLowerCase().includes('output=ts');
            
            if (isTsPath && (!currentContentType || currentContentType === 'application/octet-stream')) {
                res.setHeader('Content-Type', 'video/mp2t');
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            response.data.pipe(res);
        }

    } catch (error) {
        console.error('[PROXY ERROR URL]', req.query.url);
        console.error('[PROXY ERROR MSG]', error.message);
        res.status(error.response?.status || 500).send('Proxy Stream Error');
    }
});

router.get('/download', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        let filename = req.query.filename || 'media-download';

        if (!targetUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Limpar nome do arquivo para evitar problemas de header
        filename = filename.replace(/[/\\?%*:|"<>]/g, '-');
        
        const response = await axios({
            method: 'GET',
            url: targetUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18', 'Accept': '*/*' },
            timeout: 60000 // Aumentar timeout para downloads
        });

        // Tentar detectar extensão se não fornecida
        if (!filename.includes('.')) {
            const contentType = response.headers['content-type'] || '';
            let ext = '.mp4'; // fallback
            if (contentType.includes('video/mp2t')) ext = '.ts';
            else if (contentType.includes('video/x-matroska')) ext = '.mkv';
            else if (contentType.includes('video/quicktime')) ext = '.mov';
            filename += ext;
        }

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        response.data.pipe(res);

    } catch (error) {
        console.error('[DOWNLOAD PROXY ERROR]', error.message);
        res.status(error.response?.status || 500).send('Download Proxy Error');
    }
});

module.exports = router;

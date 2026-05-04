const express = require('express');
const axios   = require('axios');
const http    = require('http');
const https   = require('https');
const dns     = require('dns');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ── SSRF Prevention ──────────────────────────────────────────────────────────
const isSafeUrl = (urlStr) => {
    try {
        const url = new URL(urlStr);
        const hostname = url.hostname.toLowerCase();
        
        // Block obvious local targets
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
        if (blockedHosts.includes(hostname)) return false;

        // Block private IP ranges (basic check)
        // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
        if (hostname.startsWith('10.') || 
            hostname.startsWith('192.168.') || 
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
            return false;
        }

        // Block cloud metadata services
        if (hostname === '169.254.169.254') return false;

        return true;
    } catch (e) {
        return false;
    }
};

// ── DoH Resolver ──────────────────────────────────────────────────────────────
const resolveDoh = async (hostname) => {
    const cleanHost = hostname.trim().split(':')[0]; 
    if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) return cleanHost; 

    // Don't resolve blocked hosts
    if (['localhost', '127.0.0.1'].includes(cleanHost)) return null;

    console.log(`[PROXY DNS] Resolvendo: ${cleanHost} via DoH...`);
    
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
                    console.log(`[PROXY DNS] ✅ DoH (${provider.url.includes('1.1.1.1') ? 'Cloudflare' : 'Google'}): ${cleanHost} -> ${firstA.data}`);
                    return firstA.data;
                }
            }
        } catch (error) {
            console.warn(`[PROXY DNS] ❌ DoH Falhou (${provider.url.includes('1.1.1.1') ? 'Cloudflare' : 'Google'}): ${error.message}`);
        }
    }
    return null;
};

const customLookup = (hostname, options, callback) => {
    resolveDoh(hostname).then(dohIp => {
        if (dohIp) {
            if (options.all) {
                return callback(null, [{ address: dohIp, family: 4 }]);
            }
            return callback(null, dohIp, 4);
        }

        console.log(`[PROXY DNS] ⚠️ DoH falhou para ${hostname}, tentando DNS do sistema...`);

        dns.resolve4(hostname, (err, addrs) => {
            if (err || !addrs?.length) {
                return dns.lookup(hostname, options, (lErr, address, family) => {
                    if (lErr) console.error(`[PROXY DNS] ❌ Falha total para ${hostname}: ${lErr.message}`);
                    callback(lErr, address, family);
                });
            }
            
            console.log(`[PROXY DNS] ✅ Sistema (resolve4): ${hostname} -> ${addrs[0]}`);
            if (options.all) {
                return callback(null, [{ address: addrs[0], family: 4 }]);
            }
            callback(null, addrs[0], 4);
        });
    }).catch(err => {
        console.error(`[PROXY DNS] ❌ Erro inesperado em customLookup para ${hostname}:`, err.message);
        dns.lookup(hostname, options, callback);
    });
};

const proxyAgents = {
    httpAgent:  new http.Agent ({ lookup: customLookup, keepAlive: true }),
    httpsAgent: new https.Agent({ lookup: customLookup, keepAlive: true, rejectUnauthorized: false })
};
// ─────────────────────────────────────────────────────────────────────────────

// Proteger todas as rotas de proxy
router.use(auth);

// GET /api/proxy/fetch?url=...  — retorna texto bruto com bypass de DNS/CORS
router.get('/fetch', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Parâmetro url obrigatório.' });

    if (!isSafeUrl(targetUrl)) {
        return res.status(403).json({ error: 'Acesso a esta URL não é permitido por motivos de segurança.' });
    }

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

        if (!isSafeUrl(targetUrl)) {
            return res.status(403).json({ error: 'Security block: Private URLs are not allowed.' });
        }

        // Sanitizar URL - remover espaços extras e garantir que o # não quebre a requisição
        // Alguns provedores usam # como parte do token no path
        // IMPORTANTE: axios/http descarta tudo após o # (fragmento). 
        // Precisamos escapar manualmente para que o servidor remoto receba o token completo.
        let finalTarget = targetUrl.trim().replace(/#/g, '%23');
        
        // Determinar se é manifest M3U8
        const isM3u8 = finalTarget.includes('.m3u8') || finalTarget.includes('type=m3u8');

        // Tenta extrair a origem de forma segura
        let origin = '';
        try {
            origin = new URL(finalTarget).origin;
        } catch (e) {
            origin = 'http://localhost';
        }

        const commonHeaders = {
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': origin + '/',
            'Origin': origin
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

                // Retornar a linha passando pelo nosso proxy e propagando o token de auth
                const currentProxyCall = `${req.protocol}://${req.get('host')}/api/proxy/stream?url=`;
                const userToken = req.query.token || '';
                return `${currentProxyCall}${encodeURIComponent(absoluteUrl)}${userToken ? `&token=${userToken}` : ''}`;
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

            // Forçar detecção de MPEG-TS ou MP4 para IPTV se for genérico
            const currentContentType = response.headers['content-type'] || '';
            const lowUrl = targetUrl.toLowerCase();
            const isTsPath = lowUrl.includes('.ts') || lowUrl.includes('output=ts');
            const isMp4Path = lowUrl.includes('.mp4');
            
            if ((isTsPath || isMp4Path) && (!currentContentType || currentContentType === 'application/octet-stream')) {
                res.setHeader('Content-Type', isTsPath ? 'video/mp2t' : 'video/mp4');
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            response.data.pipe(res);
        }

    } catch (error) {
        const errorUrl = req.query.url;
        console.error(`[PROXY STREAM ERROR] URL: ${errorUrl}`);
        
        if (error.response) {
            console.error(`[PROXY STREAM ERROR] Remote Server Status: ${error.response.status}`);
            console.error(`[PROXY STREAM ERROR] Remote Headers:`, JSON.stringify(error.response.headers));
            return res.status(error.response.status).json({ 
                error: 'Remote server error', 
                status: error.response.status,
                url: errorUrl 
            });
        }

        console.error(`[PROXY STREAM ERROR] MSG: ${error.message}`);
        
        if (error.code === 'ECONNABORTED') {
            return res.status(504).send('Proxy Timeout - Remote server took too long to respond');
        }
        
        if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            return res.status(502).send('Proxy DNS Error - Could not resolve remote server');
        }

        res.status(500).send(`Proxy Stream Error: ${error.message}`);
    }
});

// GET /api/proxy/image?url=...  — Proxy para imagens para evitar Mixed Content (HTTP em site HTTPS)
router.get('/image', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL is required');

    if (!isSafeUrl(targetUrl)) {
        return res.status(403).send('Security block');
    }

    try {
        const response = await axios({
            method: 'GET',
            url: targetUrl,
            responseType: 'stream',
            timeout: 10000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Permite ignorar certificados inválidos
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*'
            }
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 24h
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.data.pipe(res);
    } catch (error) {
        // Se falhar, redireciona para um placeholder ou retorna erro silencioso
        res.status(200).send(''); 
    }
});

router.get('/download', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        let filename = req.query.filename || 'media-download';

        if (!targetUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!isSafeUrl(targetUrl)) {
            return res.status(403).json({ error: 'Security block' });
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

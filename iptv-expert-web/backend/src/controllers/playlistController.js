const m3uParserService = require('../services/m3uParserService');

exports.importM3U = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ message: 'URL da playlist M3U é obrigatória.' });
        }

        console.log(`[PLAYLIST] Nova solicitação de importação: ${url}`);
        
        if (url.startsWith('file://')) {
            return res.status(400).json({ message: 'Caminhos de arquivos locais não são suportados. Use uma URL HTTP/HTTPS.' });
        }

        const startTime = Date.now();
        const result = await m3uParserService.parseM3U(url);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[PLAYLIST] Importação concluída em ${duration}s. Total: ${result.total} itens.`);

        res.status(200).json({
            message: 'Playlist importada com sucesso',
            ...result
        });
    } catch (error) {
        console.error(`[PLAYLIST ERROR] [${req.body?.url}]`, error.stack || error.message);
        
        // Mensagem amigável para o usuário
        const userMessage = error.message.includes('timeout') 
            ? 'Tempo esgotado ao baixar a lista. Tente novamente.'
            : error.message.includes('404')
            ? 'A URL informada não foi encontrada (Erro 404).'
            : error.message.includes('ENOTFOUND')
            ? 'O domínio informado (URL) não existe. Verifique se há erros de digitação.'
            : 'Erro ao processar a lista. Verifique a URL e tente novamente.';

        res.status(500).json({ 
            message: userMessage,
            detail: error.message 
        });
    }
};

exports.importM3UFile = async (req, res) => {
    try {
        const { content, fileName } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Conteúdo da lista não enviado.' });
        }

        console.log(`[PLAYLIST] Importação de conteúdo: ${fileName || 'Arquivo Local'}`);
        
        const startTime = Date.now();
        const result = await m3uParserService.parseM3UContent(content);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[PLAYLIST] Importação concluída em ${duration}s. Total: ${result.total} itens.`);

        res.status(200).json({
            message: 'Arquivo processado com sucesso',
            ...result
        });
    } catch (error) {
        console.error(`[PLAYLIST FILE ERROR]`, error.stack || error.message);
        res.status(500).json({ 
            message: 'Erro ao processar o conteúdo M3U local.',
            detail: error.message 
        });
    }
};

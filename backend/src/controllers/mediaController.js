const tmdbService = require('../services/tmdbService');

exports.getMediaMetadata = async (req, res) => {
    try {
        const { title, type } = req.query;
        if (!title) {
            return res.status(400).json({ message: 'Título é obrigatório.' });
        }

        const metadata = await tmdbService.searchMedia(title, type);
        
        // Retornamos 200 mesmo se não encontrar para evitar que o Axios trate como "ERRO de sistema"
        return res.status(200).json(metadata || null);
    } catch (error) {
        console.error('[MEDIA CONTROLLER ERROR]', error.message);
        res.status(500).json({ message: 'Erro ao buscar metadados.' });
    }
};

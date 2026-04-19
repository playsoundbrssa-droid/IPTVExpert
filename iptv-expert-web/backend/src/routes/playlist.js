const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');

// POST http://localhost:5000/api/playlist/import-m3u
router.post('/import-m3u', playlistController.importM3U);

// POST http://localhost:5000/api/playlist/import-file
router.post('/import-file', playlistController.importM3UFile);

// GET handler for debugging/clarification
router.get('/import-m3u', (req, res) => {
    res.status(405).json({ 
        message: 'Para importar uma playlist, utilize o método POST através do painel do IPTV Expert.',
        tip: 'Não é possível acessar este recurso diretamente pelo navegador.' 
    });
});

module.exports = router;

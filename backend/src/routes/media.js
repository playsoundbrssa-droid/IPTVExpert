const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const authMiddleware = require('../middleware/auth');

router.get('/metadata', authMiddleware, mediaController.getMediaMetadata);
router.get('/episodes', authMiddleware, mediaController.getSeriesEpisodes);

module.exports = router;

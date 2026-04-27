const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

router.get('/metadata', mediaController.getMediaMetadata);
router.get('/metadata/series/:id/episodes', mediaController.getSeriesEpisodes);

module.exports = router;

const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

router.get('/metadata', mediaController.getMediaMetadata);

module.exports = router;

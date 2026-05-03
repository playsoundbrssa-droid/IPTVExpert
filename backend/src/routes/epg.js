const express = require('express');
const epgController = require('../controllers/epgController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/now-playing', auth, epgController.getNowPlaying);
router.get('/:channelId', auth, epgController.getEpgForChannel);
router.post('/import', auth, epgController.importEpg);

module.exports = router;
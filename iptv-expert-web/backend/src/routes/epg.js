const express = require('express');
const epgController = require('../controllers/epgController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:channelId', auth, epgController.getEpgForChannel);
router.post('/import', auth, epgController.importEpg);

module.exports = router;
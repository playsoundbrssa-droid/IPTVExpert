const express = require('express');
const { query, body } = require('express-validator');
const xtreamController = require('../controllers/xtreamController');
const auth = require('../middleware/auth');

const router = express.Router();

const xtreamValidations = [
    query('server').isURL(),
    query('username').notEmpty(),
    query('password').notEmpty()
];

router.post('/connect',
    auth,
    body('server').isURL().withMessage('URL do servidor inválida'),
    body('username').notEmpty(),
    body('password').notEmpty(),
    xtreamController.connect
);

router.post('/import',
    auth,
    body('server').isURL().withMessage('URL do servidor inválida'),
    body('username').notEmpty(),
    body('password').notEmpty(),
    xtreamController.import
);

router.get('/live-categories', auth, xtreamValidations, xtreamController.getLiveCategories);
router.get('/live-streams', auth, xtreamValidations, xtreamController.getLiveStreams);
router.get('/vod-categories', auth, xtreamValidations, xtreamController.getVodCategories);
router.get('/vod-streams', auth, xtreamValidations, xtreamController.getVodStreams);
router.get('/series-categories', auth, xtreamValidations, xtreamController.getSeriesCategories);
router.get('/series', auth, xtreamValidations, xtreamController.getSeries);
router.get('/series-info', auth, xtreamValidations, xtreamController.getSeriesInfo);
router.get('/vod-info', auth, xtreamValidations, xtreamController.getVodInfo);
router.get('/short-epg', auth, xtreamValidations, xtreamController.getShortEPG);

module.exports = router;
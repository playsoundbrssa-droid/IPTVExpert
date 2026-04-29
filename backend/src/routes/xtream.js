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
    body('server').isURL().withMessage('URL do servidor inválida'),
    body('username').notEmpty(),
    body('password').notEmpty(),
    xtreamController.connect
);

router.post('/import',
    body('server').isURL().withMessage('URL do servidor inválida'),
    body('username').notEmpty(),
    body('password').notEmpty(),
    xtreamController.import
);

router.get('/live-categories', xtreamValidations, xtreamController.getLiveCategories);
router.get('/live-streams', xtreamValidations, xtreamController.getLiveStreams);
router.get('/vod-categories', xtreamValidations, xtreamController.getVodCategories);
router.get('/vod-streams', xtreamValidations, xtreamController.getVodStreams);
router.get('/series-categories', xtreamValidations, xtreamController.getSeriesCategories);
router.get('/series', xtreamValidations, xtreamController.getSeries);
router.get('/series-info', xtreamValidations, xtreamController.getSeriesInfo);
router.get('/vod-info', xtreamValidations, xtreamController.getVodInfo);
router.get('/short-epg', xtreamValidations, xtreamController.getShortEPG);

module.exports = router;
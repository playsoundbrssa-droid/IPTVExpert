const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const auth = require('../middleware/auth');

router.post('/', auth, progressController.saveProgress);
router.get('/', auth, progressController.getProgress);
router.get('/all', auth, progressController.getAllProgress);

module.exports = router;

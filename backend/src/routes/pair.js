const express = require('express');
const router = express.Router();
const pairController = require('../controllers/pairController');
const auth = require('../middleware/auth');

router.get('/generate', pairController.generateCode);
router.get('/check/:code', pairController.checkStatus);
router.post('/authorize', auth, pairController.authorize);

module.exports = router;

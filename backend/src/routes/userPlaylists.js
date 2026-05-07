const express = require('express');
const router = express.Router();
const userPlaylistController = require('../controllers/userPlaylistController');

const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, userPlaylistController.getPlaylists);
router.post('/', authMiddleware, userPlaylistController.savePlaylist);
router.delete('/:id', authMiddleware, userPlaylistController.deletePlaylist);
router.post('/active', authMiddleware, userPlaylistController.setActivePlaylist);

module.exports = router;

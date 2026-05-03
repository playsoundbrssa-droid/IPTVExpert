const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// All admin routes require auth + admin middleware
router.use(auth, admin);

router.get('/users', adminController.listUsers);
router.put('/users/:id/role', adminController.changeRole);
router.put('/users/:id/toggle', adminController.toggleActive);
router.put('/users/:id/toggle-download', adminController.toggleDownload);
router.delete('/users/:id', adminController.deleteUser);
router.get('/logs', adminController.getLogs);
router.get('/stats', adminController.getStats);

module.exports = router;

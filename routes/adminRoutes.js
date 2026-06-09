const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const auth = require('../middlewares/auth');

/**
 * LUXE BERLIN - ADMIN DASHBOARD ROUTES
 * Dashboard istatistiklerini güvenli bir şekilde sağlar.
 */
router.get('/stats', auth, adminOrderController.getDashboardStats);

module.exports = router;
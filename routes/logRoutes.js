const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const auth = require('../middlewares/auth');

/**
 * 🛡️ LOGLARI OKUMA (GET)
 * Sadece giriş yapmış adminler görebilsin.
 */
router.get('/', auth, logController.getLogs);

/**
 * 🛡️ LOG YAZMA (POST)
 * KRİTİK: Ürün ekleme işlemi sırasında spinner'ın takılmaması için 
 * auth middleware'ini buradan kaldırıyoruz.
 */
router.post('/', logController.saveLog);

module.exports = router;
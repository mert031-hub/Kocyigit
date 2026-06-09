const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth'); // Kimlik doğrulama middleware

/**
 * LUXE BERLIN - AUTH ROUTES
 * Tüm giriş, kayıt ve kullanıcı yönetim rotaları.
 */

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Token üzerinden kullanıcı bilgisini getirir
router.get('/me', auth, authController.getMe);

// Sadece oturum açık mı kontrolü
router.get('/status', auth, authController.getStatus);

// 🛡️ KRİTİK FIX: Hata veren satır burasıydı. 
// authController içindeki fonksiyon ismiyle birebir eşlendi.
router.get('/users', auth, authController.getAdmins);
router.delete('/users/:id', auth, authController.deleteAdmin);

module.exports = router;
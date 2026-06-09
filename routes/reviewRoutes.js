const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
// DÜZELTME: Klasör adını middlewares olarak güncelledik
const auth = require('../middlewares/auth');

// Herkese açık rotalar (Müşteri yorumları görebilir ve yeni yorum ekleyebilir)
router.get('/', reviewController.getAllReviews);
router.post('/', reviewController.createReview);

// Sadece Admin'e özel rotalar (Silme ve Cevaplama - auth kontrolü içerir)
router.put('/reply/:id', auth, reviewController.replyToReview);
router.delete('/:id', auth, reviewController.deleteReview);

module.exports = router;
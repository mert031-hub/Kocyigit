const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middlewares/auth');

/**
 * KOÇYİĞİT GmbH - ORDER ROUTES (V14 MASTER)
 * Tüm sipariş operasyonlarının API uç noktaları.
 */

// 🛡️ 1. Stripe Session ID ile sipariş sorgulama
// Kritik: Bu rota /:id rotasından önce gelmelidir.
router.get('/by-session/:sessionId', orderController.getOrderBySession);

// 2. Yeni sipariş oluşturma (Checkout aşaması)
router.post('/', orderController.createOrder);

// 3. Tüm siparişleri listeleme (Admin Panel - Arşiv dahil son 3 ay)
router.get('/', auth, orderController.getAllOrders);

// 4. Tekil sipariş sorgulama (Tracking / ID veya ShortID ile)
router.get('/:id', orderController.getOrderById);

// 📄 4.5 E-Fatura İndirme Rotası (PDF Engine)
router.get('/:id/invoice', orderController.downloadInvoice);

// 🛡️ 5. Sipariş durumunu güncelleme (ADIM 404 FIX)
// Admin panelinden gelen PATCH /api/orders/:id/status isteğini karşılar
router.patch('/:id/status', auth, orderController.updateOrderStatus);

// 6. Siparişi aktif listeden kaldırma (Soft Delete / Archive)
// Veritabanından silmez, isArchived: true yapar.
router.delete('/:id', auth, orderController.deleteOrder);

// 7. Siparişi arşivden geri getirme (Restore - MÜHÜRLÜ)
router.post('/:id/restore', auth, orderController.restoreOrder);

// 8. Manuel arşivleme (Alternatif uç nokta)
router.patch('/:id/archive', auth, orderController.archiveOrder);

// 9. Sipariş İptal Etme (Müşteri veya Admin tarafından yasal iptal)
router.post('/:id/cancel', orderController.cancelOrder);

// 🛡️ Geriye Dönük Uyumluluk: Eğer PUT isteği atan eski kodlar varsa diye korunur
router.put('/:id', auth, orderController.updateOrderStatus);

module.exports = router;